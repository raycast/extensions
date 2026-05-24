import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getSyncStatus, NtnError, type Worker } from "../lib/ntn";

export default function SyncStatusView({ worker }: { worker: Worker }) {
  const [status, setStatus] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const items = await getSyncStatus(worker.workerId);
      setStatus(items);
    } catch (err) {
      const message = err instanceof NtnError ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sync status",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const markdown =
    status.length === 0 && !isLoading
      ? `_No sync capabilities registered for ${worker.name}._`
      : "```json\n" + JSON.stringify(status, null, 2) + "\n```";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Sync Status · ${worker.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={load}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Status JSON"
            content={JSON.stringify(status, null, 2)}
          />
        </ActionPanel>
      }
    />
  );
}
