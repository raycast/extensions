import { List } from "@raycast/api";
import { useClipboard } from "raycast-hooks";
import { CertListView } from "./views/CertListView";
import { showFailureToast } from "@raycast/utils";

// Main Raycast Command Component
export default function Command() {
  const { ready, clipboard: clipboardText } = useClipboard();

  if (!ready) {
    return <List isLoading={true} />;
  }

  if (!clipboardText) {
    showFailureToast(new Error("No certificate data found in clipboard"), { title: "Certificate Not Found" });
    return <List />;
  }

  return <CertListView certText={clipboardText} />;
}
