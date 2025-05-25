import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FormattedSqlDetail } from "./formatSqlDetail";
import { formatSQL } from "./utils";

/**
 * Command component for formatting selected SQL text and previewing the result
 * Uses usePromise to handle async operations for getting selected text and formatting
 */
export default function Command() {
  const { data: output } = usePromise(async () => await formatSQL(await getSelectedText()));
  if (output) {
    return <FormattedSqlDetail sql={output} />;
  }
}
