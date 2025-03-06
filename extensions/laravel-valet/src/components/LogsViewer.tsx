import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { brewDir, executeCommand, getConfig, valetHomePath } from "../helpers/general";
import { useLayoutEffect, useState } from "react";

export function LogsViewer(): JSX.Element {
  const defaultLogs = {
    "php-fpm": `${brewDir}/var/log/php-fpm.log`,
    nginx: `${valetHomePath}/Log/nginx-error.log`,
    mailhog: `${brewDir}/var/log/mailhog.log`,
    redis: `${brewDir}/var/log/redis.log`,
  };
  const { logs: userLogs } = getConfig();
  const allLogs = { ...defaultLogs, ...(userLogs ?? {}) };

  return (
    <List navigationTitle="Logs" searchBarPlaceholder="Search for a log file...">
      {Object.entries(allLogs).map(([log, path]) => (
        <ListItem log={log} path={path} key={log + path} />
      ))}
    </List>
  );
}

interface ListItemProps {
  log: string;
  path: string;
}
function ListItem({ log, path }: ListItemProps): JSX.Element {
  return (
    <List.Item
      title={log}
      accessories={[{ text: path }]}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <Action.Push title="View Log" target={<LogDetail log={log} path={path} />} />
        </ActionPanel>
      }
    />
  );
}

function LogDetail({ log, path }: ListItemProps): JSX.Element {
  const [tail, setTail] = useState("");
  const [retry, setRetry] = useState(0);
  useLayoutEffect(() => {
    // Refresh the log every second
    const timer = setTimeout(
      () => {
        executeCommand(`valet log ${log} -l 30`).then((text) => {
          if (!text) return;
          const decoder = new TextDecoder("utf-8");
          setTail(decoder.decode(text) || "File is empty");
          setRetry((retry) => retry + 1);
        });
      },
      retry ? 1000 : 0
    );
    return () => clearTimeout(timer);
  }, [retry, log]);

  return (
    <Detail navigationTitle={`${log}: Watching for updates...`} markdown={`\`\`\`\n# ${path}\n\n${tail}\n\`\`\``} />
  );
}
