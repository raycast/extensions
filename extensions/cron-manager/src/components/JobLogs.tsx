import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { CronJob, Log } from "../types";

interface JobLogsProps {
  job: CronJob;
  logs: Log[];
}

export default function JobLogs({ job, logs }: JobLogsProps) {
  return (
    <List navigationTitle={`Logs: ${job.name}`}>
      <List.EmptyView icon={Icon.Terminal} title="No logs found" />
      {logs.map((log) => (
        <List.Item
          key={log.id}
          title={log.message}
          subtitle={log.time}
          icon={
            log.type === "error"
              ? { source: Icon.XMarkCircle, tintColor: Color.Red }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={log.message} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
