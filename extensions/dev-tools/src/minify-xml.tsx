import { MinifyView } from "./components/minify-view";
import { minifyXml } from "./lib/minify/xml";

export default function Command() {
  return <MinifyView language="xml" run={minifyXml} />;
}
