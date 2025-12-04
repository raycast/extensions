import { List } from "@raycast/api";
import { useClipboard } from "raycast-hooks";
import { CertificateView } from "./views/CertificateView";
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

  return <CertificateView certText={clipboardText} />;
}
