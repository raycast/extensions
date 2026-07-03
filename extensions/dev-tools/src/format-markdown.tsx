import { FormatView } from "./components/format-view";
import { formatMarkdown } from "./lib/format/markdown";

export default function Command() {
  return <FormatView language="markdown" run={formatMarkdown} />;
}
