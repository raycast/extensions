import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { NodesListView } from "./components/NodesListView";
import { hasApiKey } from "./lib/preferences";

export default function Command() {
  if (!hasApiKey()) {
    return <MissingApiKeyDetail />;
  }

  return <NodesListView onlyIncomplete />;
}
