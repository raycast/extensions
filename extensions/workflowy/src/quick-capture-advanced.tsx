import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { QuickCaptureForm } from "./components/QuickCaptureForm";
import { hasApiKey } from "./lib/preferences";

export default function Command() {
  if (!hasApiKey()) {
    return <MissingApiKeyDetail />;
  }

  return <QuickCaptureForm />;
}
