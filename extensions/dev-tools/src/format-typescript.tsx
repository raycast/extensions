import { FormatView } from "./components/format-view";
import { formatTypescript } from "./lib/format/typescript";

export default function Command() {
  return <FormatView language="typescript" run={formatTypescript} />;
}
