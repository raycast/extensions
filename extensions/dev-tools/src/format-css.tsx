import { FormatView } from "./components/format-view";
import { formatCss } from "./lib/format/css";

export default function Command() {
  return <FormatView language="css" run={formatCss} />;
}
