import { FormatView } from "./components/format-view";
import { formatXml } from "./lib/format/xml";

export default function Command() {
  return <FormatView language="xml" run={formatXml} />;
}
