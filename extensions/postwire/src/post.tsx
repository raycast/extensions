import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  getSelectedText,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { blocker, call, link, mediaOf, nameOf, networksOf, outcomeOf, postBody } from "./postwire";

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { data, isLoading } = usePromise(() => call(apiKey, "GET", "/api/connections"));
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [unticked, setUnticked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    getSelectedText()
      .then((t) => setText((now) => now || t.trim()))
      .catch(() => undefined);
  }, []);

  const networks = data ? networksOf(data.body) : [];
  const problem = !data
    ? ""
    : data.code === 401
      ? "PostWire did not accept the API key. Check it in the extension preferences."
      : data.code !== 200
        ? "Could not reach PostWire. Try again in a moment."
        : "";
  const empty = !!data && networks.length === 0;
  const chosenMedia = mediaOf(media);
  const badLink = media.trim() !== "" && chosenMedia.kind === "none";
  // A network is ticked unless the person unticked it or it cannot take this post.
  const ticked = (platform: string, why: string) => !why && !unticked[platform];

  async function submit() {
    if (sending.current) return;
    if (!text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Write the post first" });
      return;
    }
    if (badLink) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The picture or video link is not a link",
        message: "It has to start with https://. Fix it or clear the field.",
      });
      return;
    }
    const platforms = networks.filter((n) => ticked(n.platform, blocker(n, chosenMedia))).map((n) => n.platform);
    if (!platforms.length) {
      await showToast({ style: Toast.Style.Failure, title: "Tick at least one network" });
      return;
    }
    sending.current = true;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Posting…" });
    try {
      const out = outcomeOf(await call(apiKey, "POST", "/api/post", postBody(text, platforms, chosenMedia)));
      toast.style = out.ok ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = out.title;
      toast.message = out.message;
      if (out.ok) {
        toast.primaryAction = { title: "Open Post", onAction: () => open(out.url) };
        await popToRoot({ clearSearchBar: true });
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || busy}
      actions={
        <ActionPanel>
          {!empty && !problem && !busy && <Action.SubmitForm title="Post" icon={Icon.Upload} onSubmit={submit} />}
          <Action.OpenInBrowser title="Connect a Social Account" url={link("connect")} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {problem ? <Form.Description title="PostWire" text={problem} /> : null}
      {empty && !problem ? (
        <Form.Description
          title="No Accounts Yet"
          text="Connect your social accounts in PostWire first (Actions, Connect a Social Account), then run this command again."
        />
      ) : null}
      <Form.TextArea id="text" title="Post" placeholder="What do you want to say?" value={text} onChange={setText} />
      <Form.TextField
        id="media"
        title="Picture or Video Link"
        placeholder="https://… (optional)"
        info="A public link to a picture or a video (.mp4, .mov). Leave empty for a text post."
        error={badLink ? "Has to start with https://" : undefined}
        value={media}
        onChange={setMedia}
      />
      <Form.Separator />
      {networks.map((n, i) => {
        const why = blocker(n, chosenMedia);
        return (
          <Form.Checkbox
            key={n.platform}
            id={`net_${n.platform}`}
            title={i === 0 ? "Post To" : undefined}
            label={why ? `${nameOf(n.platform)} (${why})` : nameOf(n.platform)}
            value={ticked(n.platform, why)}
            onChange={(on) => setUnticked((now) => ({ ...now, [n.platform]: !on }))}
          />
        );
      })}
    </Form>
  );
}
