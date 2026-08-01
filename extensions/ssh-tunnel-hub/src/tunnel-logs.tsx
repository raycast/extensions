import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { Tunnel } from "./lib/store";
import { logPath, readLog } from "./lib/process";

export default function TunnelLogs({ tunnel }: { tunnel: Tunnel }) {
  const { data, isLoading, revalidate } = usePromise(async () =>
    readLog(tunnel.id, 200),
  );

  useEffect(() => {
    const timer = setInterval(revalidate, 2000);
    return () => clearInterval(timer);
  }, [revalidate]);

  const body = data?.trim()
    ? `\`\`\`\n${data.trim()}\n\`\`\``
    : "Belum ada catatan. Jalankan tunnel untuk melihat keluaran ssh di sini.";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Log — ${tunnel.name}`}
      markdown={body}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Log" content={data ?? ""} />
          <Action.ShowInFinder
            title="Show Log File"
            path={logPath(tunnel.id)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
