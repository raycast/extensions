import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { createDocument } from "./word";

export default function Command() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const textRevision = useRef(0);
  async function submit() {
    if (busyRef.current) return;
    if (!text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter some document text" });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const name = await createDocument(text);
      await showToast({
        style: Toast.Style.Success,
        title: `Created ${name}`,
        message: "Save the new document in Word.",
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Could not finish creating Word document",
        message: "Check Word for a new document before trying again.",
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function useClipboardText() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const revision = textRevision.current;
    try {
      const clipboardText = (await Clipboard.readText()) ?? "";
      if (textRevision.current === revision) setText(clipboardText);
    } catch (error) {
      await showFailureToast(error, { title: "Could not read clipboard text" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Word Document" onSubmit={submit} />
          <Action title="Use Clipboard Text" onAction={useClipboardText} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new, unsaved Word document. Text is inserted as plain text. Existing documents are preserved." />
      <Form.TextArea
        id="text"
        title="Document Text"
        value={text}
        onChange={(value) => {
          textRevision.current++;
          setText(value);
        }}
        placeholder="Type text, or choose Use Clipboard Text from Actions."
      />
    </Form>
  );
}
