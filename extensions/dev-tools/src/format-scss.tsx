import { FormatView } from "./components/format-view";
import { formatScss } from "./lib/format/css";

export default function Command() {
  return <FormatView language="scss" run={formatScss} />;
}
