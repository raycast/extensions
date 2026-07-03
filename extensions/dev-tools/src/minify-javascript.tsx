import { MinifyView } from "./components/minify-view";
import { minifyJavascript } from "./lib/minify/javascript";

export default function Command() {
  return <MinifyView language="javascript" run={minifyJavascript} />;
}
