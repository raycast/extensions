import { ActionPanel } from "@raycast/api";
import { BugReportCollectDataAction, BugReportOpenAction, CopyRuntimeErrorLog } from "~/components/actions";

export function DebuggingBugReportingActionSection() {
  return (
    <ActionPanel.Section title="Debugging & Bug Reporting">
      <CopyRuntimeErrorLog />
      <BugReportOpenAction />
      <BugReportCollectDataAction />
    </ActionPanel.Section>
  );
}
