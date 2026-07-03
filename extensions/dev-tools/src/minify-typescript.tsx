import { MinifyView } from "./components/minify-view";
import { minifyTypescript } from "./lib/minify/typescript";

export default function Command() {
  return <MinifyView language="typescript" run={minifyTypescript} />;
}
