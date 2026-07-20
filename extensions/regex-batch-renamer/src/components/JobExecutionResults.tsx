import { List, Icon, Color } from "@raycast/api";
import { JobExecution } from "../types";

interface JobExecutionResultsProps {
  execution: JobExecution;
}

export default function JobExecutionResults({ execution }: JobExecutionResultsProps) {
  return (
    <List navigationTitle={`Results: ${execution.jobName}`}>
      <List.Section title="Summary">
        <List.Item title="Execution Time" subtitle={execution.executedAt.toLocaleString()} icon={Icon.Clock} />
        <List.Item title="Total Items" subtitle={execution.results.length.toString()} icon={Icon.Document} />
        <List.Item
          title="Successfully Renamed"
          subtitle={execution.successCount.toString()}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        />
        <List.Item
          title="Skipped (No Changes)"
          subtitle={execution.skippedCount.toString()}
          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
        />
        <List.Item
          title="Failed"
          subtitle={execution.failureCount.toString()}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        />
      </List.Section>

      <List.Section title="Detailed Results">
        {execution.results.map((result, index) => (
          <List.Item
            key={index}
            title={result.originalName}
            subtitle={
              result.success
                ? result.originalName !== result.newName
                  ? `→ ${result.newName}`
                  : "No changes needed"
                : `Error: ${result.error}`
            }
            icon={
              result.success
                ? result.originalName !== result.newName
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.Yellow }
                : { source: Icon.XMarkCircle, tintColor: Color.Red }
            }
            accessories={result.appliedRules.length > 0 ? [{ text: result.appliedRules.join(", ") }] : undefined}
          />
        ))}
      </List.Section>
    </List>
  );
}
