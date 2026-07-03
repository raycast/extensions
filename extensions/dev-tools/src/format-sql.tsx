import { FormatView } from "./components/format-view";
import { formatSqlCode } from "./lib/format/sql";

export default function Command() {
  return <FormatView language="sql" run={formatSqlCode} />;
}
