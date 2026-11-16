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
import { useEffect, useState } from "react";
import { Network, blocker, call, link, mediaOf, nameOf, networksOf, outcomeOf, postBody } from "./postwire";

type Values = { text: string; media: string } & Record<string, boolean | string>;

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [networks, setNetworks] = useState<Network[] | null>(null);
  const [problem, setProblem] = useState("");
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSelectedText()
      .then((t) => setText((now) => now || t.trim()))
      .catch(() => undefined);
    call(apiKey, "GET", "/api/connections").then((res) => {
      if (res.code === 401) setProblem("PostWire did not accept the API key. Check it in the extension preferences.");
      else if (res.code !== 200) setProblem("Could not reach PostWire. Try again in a moment.");
      setNetworks(networksOf(res.body));
    });
  }, []);

  const chosenMedia = mediaOf(media);

  async function submit(values: Values) {
    const platforms = (networks || [])
      .filter((n) => values[`net_${n.platform}`] === true && !blocker(n, chosenMedia))
      .map((n) => n.platform);
    if (!String(values.text).trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Write the post first" });
      return;
    }
    if (!platforms.length) {
      await showToast({ style: Toast.Style.Failure, title: "Tick at least one network" });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Posting…" });
    const out = outcomeOf(await call(apiKey, "POST", "/api/post", postBody(values.text, platforms, chosenMedia)));
    setBusy(false);
    toast.style = out.ok ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = out.title;
    toast.message = out.message;
    if (out.ok) {
      toast.primaryAction = { title: "Open Post", onAction: () => open(out.url) };
      await popToRoot({ clearSearchBar: true });
    }
  }

  const empty = networks !== null && networks.length === 0;

  return (
    <Form
      isLoading={networks === null || busy}
      actions={
        <ActionPanel>
          {!empty && !problem && <Action.SubmitForm title="Post" icon={Icon.Upload} onSubmit={submit} />}
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
        value={media}
        onChange={setMedia}
      />
      <Form.Separator />
      {(networks || []).map((n, i) => {
        const why = blocker(n, chosenMedia);
        return (
          <Form.Checkbox
            key={n.platform}
            id={`net_${n.platform}`}
            title={i === 0 ? "Post To" : undefined}
            label={why ? `${nameOf(n.platform)} (${why})` : nameOf(n.platform)}
            defaultValue={!why}
          />
        );
      })}
    </Form>
  );
}
