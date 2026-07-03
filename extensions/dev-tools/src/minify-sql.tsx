import { MinifyView } from "./components/minify-view";
import { minifySql } from "./lib/minify/sql";

export default function Command() {
  return <MinifyView language="sql" run={minifySql} />;
}
