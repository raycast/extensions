import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { openMint } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { RetryActions } from "./confirm-in-mint";
import { historyRows, runParity } from "./mint-parity";
import type { HistoryAnswer, HistoryKind } from "./mint-parity";
import { useMintCLI } from "./use-mint-cli";

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <History cli={resolution.path} />;
}

const ICONS: Record<HistoryKind, Icon> = {
  disk: Icon.HardDrive,
  memory: Icon.MemoryChip,
  organize: Icon.Folder,
  uninstall: Icon.AppWindow,
};
const TITLES: Record<HistoryKind, string> = {
  disk: "Disk",
  memory: "Memory",
  organize: "Organize",
  uninstall: "Uninstall",
};

/** What Mint did, newest first, as its Log page lists it. Read only. */
function History({ cli }: { cli: string }) {
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runParity<HistoryAnswer>(path, { action: "history.list", limit: 200 }, 60_000),
    [cli],
  );
  const rows = historyRows(data);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search what Mint did">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint could not read its history"
          description={error.message}
          actions={<RetryActions onRetry={revalidate} />}
        />
      ) : null}
      {!error && !isLoading && rows.length === 0 ? <List.EmptyView icon={Icon.Clock} title="Nothing yet" /> : null}
      {rows.map((row, index) => (
        <List.Item
          key={`${row.kind}-${row.date}-${index}`}
          icon={ICONS[row.kind]}
          title={row.title}
          subtitle={row.detail}
          keywords={[TITLES[row.kind], row.automatic ? "Auto Care" : "By hand"]}
          accessories={[
            ...(row.automatic ? [{ tag: "Auto Care" }] : []),
            { date: new Date(row.date), tooltip: TITLES[row.kind] },
          ]}
          actions={
            <ActionPanel>
              <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}

                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
