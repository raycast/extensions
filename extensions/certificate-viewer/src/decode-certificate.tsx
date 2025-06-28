import { List } from "@raycast/api";
import { useClipboard } from "raycast-hooks";
import { CertListView } from "./views/CertListView";

// Main Raycast Command Component
export default function Command() {
  const { ready, clipboard: clipboardText } = useClipboard();

  if (!ready) {
    return <List isLoading={true} />;
  }

  if (!clipboardText) {
    throw "No certificate data found in clipboard.";
  }

  return <CertListView certText={clipboardText} />;
}
