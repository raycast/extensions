import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { formatBytes, parseSnapzyDate } from "./snapzy";
import { dbErrorProps, dbMissingProps, ROW_LIMIT, TryAgainAction, useSnapzyDB } from "./snapzy-db";

type UploadRow = {
  id: string;
  fileName: string;
  publicURL: string;
  fileSize: number | null;
  uploadedAt: string;
  providerType: string;
  expireTime: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  aws_s3: "Amazon S3",
  cloudflare_r2: "Cloudflare R2",
  google_drive: "Google Drive",
};

// Known providers get proper names; unknown enum values are prettified, not leaked raw.
function providerLabel(providerType: string): string {
  return PROVIDER_LABELS[providerType] ?? providerType.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const EXPIRE_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

// expireTime is Snapzy's TTL string ("7d", "24h"); null/unknown formats mean no known expiry.
function parseTtlMs(ttl: string | null): number | null {
  const match = /^(\d+)([smhdw])$/.exec(ttl ?? "");
  return match ? Number(match[1]) * EXPIRE_UNIT_MS[match[2]] : null;
}

function accessories(row: UploadRow): List.Item.Accessory[] {
  const uploaded = parseSnapzyDate(row.uploadedAt);
  const ttlMs = parseTtlMs(row.expireTime);
  const result: List.Item.Accessory[] = [];
  if (uploaded) {
    const expiry = ttlMs != null ? new Date(uploaded.getTime() + ttlMs) : null;
    if (expiry && expiry.getTime() <= Date.now()) {
      result.push({ tag: "Expired", tooltip: `Link expired ${expiry.toLocaleString()}` });
    } else if (expiry) {
      result.push({ date: expiry, tooltip: `Expires ${expiry.toLocaleString()}` });
    }
    result.push({ date: uploaded, tooltip: `Uploaded ${uploaded.toLocaleString()}` });
  } else {
    // Upload date didn't parse (format drift): show what we know instead of hiding everything.
    if (ttlMs != null) {
      result.push({ tag: "Expiry unknown", tooltip: "Couldn't read the upload date to compute link expiry" });
    }
    if (row.uploadedAt) result.push({ text: row.uploadedAt, tooltip: "Uploaded" });
  }
  return result;
}

export default function Command() {
  const { rows, isLoading, error, permissionView, revalidate, dbExists } = useSnapzyDB<UploadRow>(
    `SELECT id, fileName, publicURL, fileSize, uploadedAt, providerType, expireTime
     FROM cloudUploadRecord ORDER BY uploadedAt DESC LIMIT ${ROW_LIMIT}`,
  );
  if (permissionView) return permissionView;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter uploads by file name">
      {!dbExists ? (
        <List.EmptyView {...dbMissingProps("Install Snapzy and upload a capture — your links appear here.")} />
      ) : error ? (
        <List.EmptyView
          {...dbErrorProps("uploads")}
          actions={
            <ActionPanel>
              <TryAgainAction onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : !isLoading && rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No cloud uploads yet"
          description="Upload a capture from Snapzy's Quick Access panel, or with ⌘U in the annotator."
        />
      ) : (
        <List.Section title={rows.length >= ROW_LIMIT ? `Latest ${ROW_LIMIT} uploads` : undefined}>
          {rows.map((row) => (
            <List.Item
              key={row.id}
              icon={Icon.Cloud}
              title={row.fileName}
              subtitle={
                row.fileSize != null
                  ? `${providerLabel(row.providerType)} · ${formatBytes(row.fileSize)}`
                  : providerLabel(row.providerType)
              }
              accessories={accessories(row)}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy URL" content={row.publicURL} />
                  <Action.OpenInBrowser url={row.publicURL} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
