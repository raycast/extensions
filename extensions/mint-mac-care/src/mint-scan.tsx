import { Detail, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import { canRevalidateMintCLI, escapeMarkdown, formatBytes, parseMintCommandJSON, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type MintScan = {
  totalBytes?: number;
  totalHuman?: string;
  isDeveloper?: boolean;
  items?: Array<{ category?: string; label?: string; path?: string; sizeBytes?: number; sizeHuman?: string }>;
  error?: string;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  const cli = resolution.status === "ready" ? resolution.path : undefined;
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", ["scan", "--json"], {
    execute: Boolean(cli),
    timeout: 30_000,
  });

  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  const scan = parseMintCommandJSON<MintScan>(data, "scan-lite.v1");
  const refresh = () => {
    const nextResolution = recheck();
    if (canRevalidateMintCLI(cli, nextResolution)) revalidate();
  };

  const markdown = error
    ? `# Scan failed\n\n${error.message}`
    : scan?.error
      ? `# Scan failed\n\n${scan.error}`
      : data && !scan
        ? "# Mint update required\n\nMint returned output that does not match the signed scan-lite.v1 contract. Update Mint and try again."
        : scan
          ? renderScan(scan)
          : `# Scanning your Mac…\n\nMint is checking developer and project caches without changing files.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Mint Scan"
      actions={<MintActions output={data} onRefresh={refresh} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Mode" text="Read-only" icon={Icon.Eye} />
          <Detail.Metadata.Label title="Cleanup" text="Review in Mint" icon={Icon.AppWindow} />
        </Detail.Metadata>
      }
    />
  );
}

function renderScan(scan: MintScan): string {
  const items = scan.items ?? [];
  const summary = items.length
    ? `Mint found **${escapeMarkdown(scan.totalHuman ?? formatBytes(scan.totalBytes))}** across ${items.length} cache ${items.length === 1 ? "location" : "locations"}.`
    : "Mint did not find any developer or project caches to review.";
  const rows = items
    .map(
      (item) =>
        `| ${escapeMarkdown(item.label ?? item.category ?? "Cache")} | ${escapeMarkdown(shortPath(item.path ?? ""))} | ${escapeMarkdown(item.sizeHuman ?? formatBytes(item.sizeBytes))} |`,
    )
    .join("\n");

  return [
    "# Focused reclaimable-space scan",
    "",
    "This is a read-only scan of developer and project caches. Full review and cleanup stay inside Mint.",
    "",
    summary,
    ...(rows ? ["", "| Location | Path | Size |", "| --- | --- | ---: |", rows] : []),
  ].join("\n");
}
