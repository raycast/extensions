import { DigFromSources } from "./components/DigFromSources";
import { fromClipboard } from "./utils/urlSources";

export default function Command() {
  return <DigFromSources readers={[fromClipboard]} />;
}
