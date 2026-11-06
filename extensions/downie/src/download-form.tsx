import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { sendLinks } from "./downie";
import { parseLinks, Postprocessing } from "./urls";

export function DownloadForm({ clipboard = false }: { clipboard?: boolean }) {
  const [text, setText] = useState("");
  const [postprocessing, setPostprocessing] = useState<Postprocessing>("default");
  const [destination, setDestination] = useState<string[]>([]);
  const [extraction, setExtraction] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (clipboard)
      Clipboard.readText()
        .then((text) => setText(text ?? ""))
        .catch((error) => showFailureToast(error));
  }, [clipboard]);
  async function submit() {
    if (busy) return;
    let links: string[];
    try {
      links = parseLinks(text);
    } catch (error) {
      await showFailureToast(error, { title: "Check the download links" });
      return;
    }
    setBusy(true);
    try {
      const sent = await sendLinks(links, { postprocessing, destination: destination[0], extraction });
      await showToast({
        style: Toast.Style.Success,
        title: `Sent ${sent} ${sent === 1 ? "link" : "links"} to Downie`,
        message: extraction ? "Complete extraction in Downie." : "Check Downie for download progress.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not send links to Downie" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={extraction ? "Open Extraction in Downie" : "Send to Downie"} onSubmit={submit} />
          <Action title="Use Clipboard Links" onAction={async () => setText((await Clipboard.readText()) ?? "")} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="links"
        title="Video URLs"
        value={text}
        onChange={setText}
        placeholder="One HTTP or HTTPS URL per line"
      />
      <Form.Checkbox
        id="extraction"
        title="Extraction"
        label="Open User-Guided Extraction"
        value={extraction}
        onChange={setExtraction}
      />
      {!extraction && (
        <Form.Dropdown
          id="postprocessing"
          title="Postprocessing"
          value={postprocessing}
          onChange={(value) => setPostprocessing(value as Postprocessing)}
        >
          <Form.Dropdown.Item value="default" title="Use Downie Settings" />
          <Form.Dropdown.Item value="audio" title="Extract Audio Only" />
          <Form.Dropdown.Item value="mp4" title="Convert to MP4" />
        </Form.Dropdown>
      )}
      <Form.FilePicker
        id="destination"
        title="Destination"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={destination}
        onChange={setDestination}
      />
      <Form.Description text="An empty destination uses Downie’s settings. Sending links adds them to Downie; download completion and site errors are shown in Downie." />
    </Form>
  );
}
