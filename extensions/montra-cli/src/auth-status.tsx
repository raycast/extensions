import { Detail } from "@raycast/api";
import { useMemo } from "react";
import { useExec } from "@raycast/utils";
import { getPrefs, resolveMontraPath } from "./utils/exec";

export default function Command() {
  const prefs = getPrefs();
  const args = useMemo(() => ["auth", "status", "-e", prefs.defaultEnvironment], [prefs.defaultEnvironment]);
  const { isLoading, data, error } = useExec(resolveMontraPath(), args, { keepPreviousData: true });
  const markdown = error ? `Error: ${error.message}` : `\`\`\`\n${data || ""}\n\`\`\``;

  return <Detail isLoading={isLoading} navigationTitle="Auth: Status" markdown={markdown} />;
}
