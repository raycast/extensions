import { FormatView } from "./components/format-view";
import { formatHtml } from "./lib/format/html";

export default function Command() {
  return <FormatView language="html" run={formatHtml} />;
}
