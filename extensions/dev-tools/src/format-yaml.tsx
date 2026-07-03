import { FormatView } from "./components/format-view";
import { formatYaml } from "./lib/format/yaml";

export default function Command() {
  return <FormatView language="yaml" run={formatYaml} />;
}
