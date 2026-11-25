import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { containsSetupCredential, dropFileFromPath, dropText, type DropItem } from "./api";
import BrowseDropsCommand from "./browse-drops";

export default function DropCommand() {
  const started = useRef(false);
  const busy = useRef(false);
  const [loading, setLoading] = useState(true);
  const [uploaded, setUploaded] = useState<DropItem>();
  const [message, setMessage] = useState("Reading clipboard…");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  async function send(content: { text?: string; files?: string[] }) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      let item: DropItem;
      if (content.files?.length) {
        for (const [index, file] of content.files.entries()) {
          setMessage(`Uploading file ${index + 1} of ${content.files.length}…`);
          item = await dropFileFromPath(file);
          // Keep only unfinished files if a later upload fails.
          setFiles(content.files.slice(index + 1));
        }
      } else if (content.text?.trim()) {
        setMessage("Sending text…");
        item = await dropText(content.text);
      } else {
        setMessage("Clipboard is empty or unsupported. Enter text or choose files below.");
        return;
      }
      setUploaded(item!);
      await showToast({ style: Toast.Style.Success, title: "Dropped successfully", message: "Selected in Browse" });
    } catch (error) {
      setMessage((error as Error).message);
      await showToast({ style: Toast.Style.Failure, title: "Drop failed", message: (error as Error).message });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void Clipboard.read()
      .then((content) => {
        if (content.text && containsSetupCredential(content.text)) {
          setMessage("Clipboard contains OwnDrop credentials. Paste them into extension preferences.");
          setLoading(false);
          return;
        }
        const clipboardFiles = content.file ? [content.file] : [];
        setFiles(clipboardFiles);
        setText(content.text ?? "");
        return send({ files: clipboardFiles, text: content.text });
      })
      .catch((error: Error) => {
        setMessage(error.message);
        setLoading(false);
      });
  }, []);

  if (uploaded) return <BrowseDropsCommand uploaded={uploaded} />;

  return (
    <Form
      navigationTitle="Drop"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Drop" onSubmit={() => send({ text, files })} />
          <Action.Push title="Browse" target={<BrowseDropsCommand />} />
        </ActionPanel>
      }
    >
      <Form.Description text={message} />
      <Form.TextArea id="text" title="Text or URL" value={text} onChange={setText} />
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={setFiles}
        allowMultipleSelection
        canChooseFiles
        canChooseDirectories={false}
      />
      <Form.Description text="Selected files take priority over text." />
    </Form>
  );
}
