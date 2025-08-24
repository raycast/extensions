import { ActionPanel } from "@raycast/api";
import { BugReportCollectDataAction, BugReportOpenAction, CopyRuntimeErrorLog } from "~/components/actions";
import { useCliVersion } from "~/utils/hooks/useCliVersion";

export function DebuggingBugReportingActionSection() {
  const cliVersion = useCliVersion();

  return (
    <ActionPanel.Section title={`Debugging & Bug Reporting (CLI v${cliVersion})`}>
      <CopyRuntimeErrorLog />
      <BugReportOpenAction />
      <BugReportCollectDataAction />
    </ActionPanel.Section>
  );
}
