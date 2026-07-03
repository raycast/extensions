import { MinifyView } from "./components/minify-view";
import { minifyHtml } from "./lib/minify/html";

export default function Command() {
  return <MinifyView language="html" run={minifyHtml} />;
}
