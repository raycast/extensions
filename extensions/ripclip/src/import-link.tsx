import { Action, ActionPanel, Clipboard, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { api, SITE } from "./ripclip";

type Values = { url: string; rights: boolean };

export default function ImportLink() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && /^https?:\/\/\S+$/.test(text.trim())) setUrl(text.trim());
    });
  }, []);

  async function submit(values: Values) {
    if (!/^https?:\/\/\S+$/.test(values.url.trim())) return setError("Paste a link to a video");
    if (!values.rights) {
      await showToast({ style: Toast.Style.Failure, title: "Confirm you own the video or have permission" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending to RipClip" });
    try {
      await api("/imports", { url: values.url.trim(), rights: true });
      toast.style = Toast.Style.Success;
      toast.title = "Importing";
      toast.message = "Your clips list fills in once RipClip has found clips";
      toast.primaryAction = { title: "Open RipClip", onAction: () => open(SITE) };
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Import refused";
      toast.message = (e as Error).message;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Video" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Video link"
        placeholder="Kick or Twitch VOD, podcast episode, Drive or Dropbox link"
        value={url}
        error={error}
        onChange={(v) => {
          setUrl(v);
          setError(undefined);
        }}
      />
      <Form.Checkbox id="rights" label="I own this video or have permission to use it" defaultValue={false} />
      <Form.Description text="Importing is free. Finding clips is quoted in Horizon Units in RipClip before it runs." />
    </Form>
  );
}
