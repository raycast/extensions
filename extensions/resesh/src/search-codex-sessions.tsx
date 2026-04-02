import { codexProvider } from "./providers/codex";
import { SessionSearchView } from "./shared-search";

export default function Command() {
  return <SessionSearchView provider={codexProvider} />;
}
