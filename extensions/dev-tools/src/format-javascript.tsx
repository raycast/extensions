import { FormatView } from "./components/format-view";
import { formatJavascript } from "./lib/format/javascript";

export default function Command() {
  return <FormatView language="javascript" run={formatJavascript} />;
}
