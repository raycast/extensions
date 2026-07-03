import { MinifyView } from "./components/minify-view";
import { minifyCss } from "./lib/minify/css";

export default function Command() {
  return <MinifyView language="css" run={minifyCss} />;
}
