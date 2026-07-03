import { FormatView } from "./components/format-view";
import { formatLess } from "./lib/format/css";

export default function Command() {
  return <FormatView language="less" run={formatLess} />;
}
