import { Color, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import { findMintCLI, formatBytes, parseJSON, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";

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
};

export default function Command() {
  const cli = findMintCLI();
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", ["status", "--json"], {
    execute: Boolean(cli),
    timeout: 30_000,
  });

  if (!cli) return <MissingMint />;

  const status = parseJSON<MintStatus>(data);
  const disk = status?.disk;
  const week = status?.last7Days;
  const errorText = error ? `${error.name}: ${error.message}` : !isLoading && data && !status ? data : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Mint status">
      {errorText ? (
        <List.EmptyView title="Mint CLI returned an error" description={errorText} icon={Icon.Warning} />
      ) : null}

      <List.Section title="Storage">
        <List.Item
          icon={{ source: Icon.HardDrive, tintColor: Color.Green }}
          title={disk ? `${disk.freeGB?.toFixed(1) ?? "—"} GB free` : "No scan history yet"}
          subtitle={
            disk ? `${disk.usedGB?.toFixed(0) ?? "—"} of ${disk.totalGB?.toFixed(0) ?? "—"} GB used` : undefined
          }
          accessories={[{ text: disk?.reclaimableHuman ?? "Open Mint and scan" }]}
          actions={<MintActions output={data} onRefresh={revalidate} />}
        />
        <List.Item
          icon={Icon.Calendar}
          title="Last 7 days"
          subtitle={`${week?.moveCount ?? 0} files organized · ${week?.activityCount ?? 0} actions`}
          accessories={[{ text: `${formatBytes(week?.bytesFreed)} freed` }]}
          actions={<MintActions output={data} onRefresh={revalidate} />}
        />
      </List.Section>

      {status?.managedFolders?.length ? (
        <List.Section title="Managed Folders" subtitle={`${status.managedFolders.length} active`}>
          {status.managedFolders.map((folder) => (
            <List.Item
              key={folder.path}
              icon={Icon.Folder}
              title={folder.displayName}
              subtitle={shortPath(folder.path)}
              actions={<MintActions output={data} onRefresh={revalidate} />}
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
              actions={<MintActions output={data} onRefresh={revalidate} />}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
