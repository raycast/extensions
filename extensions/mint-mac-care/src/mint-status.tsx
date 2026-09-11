import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import { canRevalidateMintCLI, formatBytes, parseMintCommandJSON, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type MintStatus = {
  disk?: {
    totalGB?: number;
    freeGB?: number;
    usedGB?: number;
    reclaimableBytes?: number;
    reclaimableHuman?: string;
    scanDate?: string;
  };
  last7Days?: { moveCount?: number; activityCount?: number; bytesFreed?: number };
  managedFolders?: Array<{ path: string; displayName: string }>;
  recentActivity?: Array<{ ts?: string; action?: string; from?: string; to?: string; message?: string }>;
  trend?: Array<{ date: string; totalBytes: number; diskFreeGB: number }>;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  const cli = resolution.status === "ready" ? resolution.path : undefined;
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", ["status", "--json"], {
    execute: Boolean(cli),
    timeout: 30_000,
  });

  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;

  const status = parseMintCommandJSON<MintStatus>(data, "status.v1");
  const disk = status?.disk;
  const week = status?.last7Days;
  const trend = status?.trend?.slice(-7).reverse() ?? [];
  const refresh = () => {
    const nextResolution = recheck();
    if (canRevalidateMintCLI(cli, nextResolution)) revalidate();
  };
  const errorText = error
    ? `${error.name}: ${error.message}`
    : status?.error
      ? status.error
      : !isLoading && data && !status
        ? "Mint returned output that does not match the signed status.v1 contract. Update Mint and try again."
        : undefined;

  if (errorText) {
    return (
      <List searchBarPlaceholder="Search Mint status">
        <List.EmptyView
          title="Mint CLI returned an error"
          description={errorText}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Mint status">
      <List.Section title="Storage">
        <List.Item
          icon={{ source: Icon.HardDrive, tintColor: Color.Green }}
          title={disk ? `${disk.freeGB?.toFixed(1) ?? "—"} GB free` : "No scan history yet"}
          subtitle={
            disk ? `${disk.usedGB?.toFixed(0) ?? "—"} of ${disk.totalGB?.toFixed(0) ?? "—"} GB used` : undefined
          }
          accessories={[{ text: disk?.reclaimableHuman ?? "Open Mint and scan" }]}
          actions={<MintActions output={data} onRefresh={refresh} />}
        />
        <List.Item
          icon={Icon.Calendar}
          title="Last 7 days"
          subtitle={`${week?.moveCount ?? 0} files organized · ${week?.activityCount ?? 0} actions`}
          accessories={[{ text: `${formatBytes(week?.bytesFreed)} freed` }]}
          actions={<MintActions output={data} onRefresh={refresh} />}
        />
      </List.Section>

      {trend.length ? (
        <List.Section title="Storage Trend" subtitle={`${trend.length} recent scans`}>
          {trend.map((point, index) => {
            const date = new Date(point.date);
            const title = Number.isNaN(date.getTime())
              ? "Mint scan"
              : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
            return (
              <List.Item
                key={`${point.date}-${index}`}
                icon={Icon.Calendar}
                title={title}
                subtitle={`${formatBytes(point.totalBytes)} reclaimable`}
                accessories={[{ text: `${point.diskFreeGB.toFixed(1)} GB free` }]}
                actions={<MintActions output={data} onRefresh={refresh} />}
              />
            );
          })}
        </List.Section>
      ) : null}

      {status?.managedFolders?.length ? (
        <List.Section title="Managed Folders" subtitle={`${status.managedFolders.length} active`}>
          {status.managedFolders.map((folder) => (
            <List.Item
              key={folder.path}
              icon={Icon.Folder}
              title={folder.displayName}
              subtitle={shortPath(folder.path)}
              actions={<MintActions output={data} onRefresh={refresh} />}
            />
          ))}
        </List.Section>
      ) : null}

      {status?.recentActivity?.length ? (
        <List.Section title="Recent Activity">
          {status.recentActivity.slice(0, 12).map((entry, index) => (
            <List.Item
              key={`${entry.ts ?? "activity"}-${index}`}
              icon={entry.action === "error" ? Icon.Warning : Icon.CheckCircle}
              title={entry.message ?? entry.action ?? "Mint activity"}
              subtitle={entry.from ? shortPath(entry.from) : undefined}
              accessories={[{ date: entry.ts ? new Date(entry.ts) : undefined }]}
              actions={<MintActions output={data} onRefresh={refresh} />}
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Compatibility">
        <List.Item
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={resolution.version.appVersion ? `Mint ${resolution.version.appVersion}` : "Mint Direct Edition"}
          subtitle={`CLI schema ${resolution.version.schemaVersion}`}
          accessories={resolution.version.appBuild ? [{ text: `Build ${resolution.version.appBuild}` }] : []}
          actions={<MintActions output={data} onRefresh={refresh} />}
        />
      </List.Section>
    </List>
  );
}
