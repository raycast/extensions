import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { generate } from "./kavel";

const SITE = "https://www.kavel.ai/?utm_source=raycast&utm_medium=extension";

function Result({ url, prompt }: { url: string; prompt: string }) {
  return (
    <Detail
      markdown={`![${prompt.replace(/[[\]]/g, "")}](${url})`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Image URL" content={url} />
          <Action.OpenInBrowser title="Open Image" url={url} />
          <Action.OpenInBrowser title="More Models on Kavel" url={SITE} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { apiKey } = getPreferenceValues<{ apiKey?: string }>();
  const { push } = useNavigation();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: { prompt: string; ratio: string }) {
    // One run at a time: a second Enter during a run would start another job and spend more credits.
    if (busy) return;
    if (!values.prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Write a prompt first",
      });
      return;
    }
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending to Kavel…",
    });
    try {
      const url = await generate(
        values.prompt.trim(),
        values.ratio,
        apiKey || undefined,
        (s) => {
          toast.title = s;
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Image ready";
      push(<Result url={url} prompt={values.prompt} />);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Kavel";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Image" onSubmit={onSubmit} />
          <Action.OpenInBrowser title="Open Kavel" url={SITE} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="matte black ceramic mug on pale oak, soft window light from the left"
      />
      <Form.Dropdown id="ratio" title="Aspect Ratio" defaultValue="1:1">
        <Form.Dropdown.Item value="1:1" title="1:1 Square" />
        <Form.Dropdown.Item value="16:9" title="16:9 Landscape" />
        <Form.Dropdown.Item value="9:16" title="9:16 Portrait" />
        <Form.Dropdown.Item value="4:3" title="4:3" />
        <Form.Dropdown.Item value="3:4" title="3:4" />
      </Form.Dropdown>
    </Form>
  );
}
