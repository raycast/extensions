import { claudeProvider } from "./providers/claude";
import { SessionSearchView } from "./shared-search";

export default function Command() {
  return <SessionSearchView provider={claudeProvider} />;
}
