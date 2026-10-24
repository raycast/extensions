import { Clipboard, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fileURLToPath } from "node:url";
import { SendForm } from "./components/SendForm";

export default function Command() {
  const { data, isLoading } = usePromise(() => Clipboard.read());
  if (isLoading || data === undefined) return <Detail isLoading markdown="" />;
  if (data.file) {
    const path = data.file.startsWith("file://") ? fileURLToPath(data.file) : data.file;
    return <SendForm payload={{ kind: "Send Clipboard to Agent", files: [path] }} />;
  }
  if (!data.text?.trim()) return <Detail markdown={"## The clipboard is empty\n\nCopy some text or a file first."} />;
  const text = data.text.trim();
  const isURL = /^https?:\/\/\S+$/.test(text);
  return (
    <SendForm
      payload={
        isURL ? { kind: "Send Clipboard to Agent", url: text } : { kind: "Send Clipboard to Agent", selection: text }
      }
    />
  );
}
