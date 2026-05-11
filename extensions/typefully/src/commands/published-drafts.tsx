import { DraftsList } from "./drafts";
import { ApiKeyRequiredView } from "../components/api-key-required";
import { getPreferences } from "../lib/preferences";

export default function Command() {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    return <ApiKeyRequiredView />;
  }
  return <DraftsList fixedStatus="published" />;
}
