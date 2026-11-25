import { Action, ActionPanel, Clipboard, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import { api, SITE } from "./ripclip";

type Values = { url: string; rights: boolean };

const isLink = (text: string) => /^https?:\/\/\S+$/.test(text.trim());

export default function ImportLink() {
  const { handleSubmit, itemProps, setValue } = useForm<Values>({
    async onSubmit(values) {
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
    },
    initialValues: { url: "", rights: false },
    validation: {
      url: (value) => (value && isLink(value) ? undefined : "Paste a link to a video"),
      rights: (value) => (value ? undefined : "Confirm you own the video or have permission"),
    },
  });

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && isLink(text)) setValue("url", text.trim());
    });
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Video" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Video link"
        placeholder="Kick or Twitch VOD, podcast episode, Drive or Dropbox link"
        {...itemProps.url}
      />
      <Form.Checkbox label="I own this video or have permission to use it" {...itemProps.rights} />
      <Form.Description text="Importing is free. Finding clips is quoted in Horizon Units in RipClip before it runs." />
    </Form>
  );
}
