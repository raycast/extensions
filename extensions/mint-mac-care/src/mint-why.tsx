import { Detail, LaunchProps } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import {
  canRevalidateMintCLI,
  escapeMarkdown,
  formatBytes,
  formatSignedBytes,
  parseMintCommandJSON,
  shortPath,
} from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type Arguments = { path?: string };
type MintWhy = {
  analysis?: "growth" | "path";
  error?: string;
  period?: { from?: string; to?: string; days?: number };
  totalReclaimable?: number;
  totalDelta?: number;
  dailyRate?: number;
  categories?: Array<{ category?: string; currentBytes?: number; previousBytes?: number; deltaBytes?: number }>;
  last7Days?: { filesMoved?: number; bytesCleaned?: number };
  path?: string;
  batchCount?: number;
  totalOperations?: number;
  batches?: Array<{
    timestamp?: string;
    trigger?: string;
    operations?: Array<{
      fileName?: string;
      sourcePath?: string;
      operationType?: string;
      fileSize?: number;
      reason?: { rule?: string; confidence?: number; primaryExplanation?: string };
    }>;
  }>;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { resolution, recheck } = useMintCLI();
  const cli = resolution.status === "ready" ? resolution.path : undefined;
  const path = props.arguments.path?.trim();
  const args = path ? ["why", path, "--json"] : ["why", "--json"];
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", args, {
    execute: Boolean(cli),
    timeout: 30_000,
  });

  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  const explanation = parseMintCommandJSON<MintWhy>(data, "why.v1");
  const refresh = () => {
    const nextResolution = recheck();
    if (canRevalidateMintCLI(cli, nextResolution)) revalidate();
  };

  const title = path ? `Why: ${shortPath(path)}` : "Why is reclaimable space changing?";
  const markdown = error
    ? `# Explanation failed\n\n${error.message}`
    : explanation?.error
      ? `# Explanation unavailable\n\n${explanation.error}`
      : data && !explanation
        ? "# Mint update required\n\nMint returned output that does not match the signed why.v1 contract. Update Mint and try again."
        : explanation
          ? renderExplanation(explanation, title)
          : `# ${title}\n\nReading Mint's on-device scan history and operation journal…`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Mint Why"
      actions={<MintActions output={data} onRefresh={refresh} />}
    />
  );
}

function renderExplanation(explanation: MintWhy, title: string): string {
  if (explanation.analysis === "path") return renderPathExplanation(explanation, title);

  const days = explanation.period?.days ?? 0;
  const categories = (explanation.categories ?? [])
    .filter((item) => item.deltaBytes !== 0)
    .sort((left, right) => Math.abs(right.deltaBytes ?? 0) - Math.abs(left.deltaBytes ?? 0))
    .slice(0, 8);
  const categoryRows = categories
    .map(
      (item) =>
        `| ${escapeMarkdown(item.category ?? "Other")} | ${formatBytes(item.currentBytes)} | ${formatSignedBytes(item.deltaBytes)} |`,
    )
    .join("\n");
  const activity = explanation.last7Days;

  return [
    `# ${escapeMarkdown(title)}`,
    "",
    `Current reclaimable space is **${formatBytes(explanation.totalReclaimable)}**. It changed **${formatSignedBytes(explanation.totalDelta)}**${days ? ` over ${days} ${days === 1 ? "day" : "days"}` : ""}${explanation.dailyRate ? ` (${formatSignedBytes(explanation.dailyRate)}/day)` : ""}.`,
    ...(categoryRows
      ? [
          "",
          "## Biggest category changes",
          "",
          "| Category | Current | Change |",
          "| --- | ---: | ---: |",
          categoryRows,
        ]
      : ["", "No category changed during this comparison period."]),
    "",
    "## Mint activity in the last 7 days",
    "",
    `${activity?.filesMoved ?? 0} files organized · ${formatBytes(activity?.bytesCleaned)} cleaned`,
  ].join("\n");
}

function renderPathExplanation(explanation: MintWhy, fallbackTitle: string): string {
  const displayPath = shortPath(explanation.path ?? fallbackTitle.replace(/^Why:\s*/, ""));
  const operations = (explanation.batches ?? [])
    .flatMap((batch) =>
      (batch.operations ?? []).map((operation) => ({
        ...operation,
        timestamp: batch.timestamp,
        trigger: batch.trigger,
      })),
    )
    .slice(0, 12);
  const operationRows = operations
    .map((operation) => {
      const date = operation.timestamp ? new Date(operation.timestamp) : undefined;
      const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "Recent";
      const reason = operation.reason?.primaryExplanation ?? operation.reason?.rule ?? operation.trigger ?? "Mint rule";
      return `| ${escapeMarkdown(when)} | ${escapeMarkdown(operation.operationType ?? "activity")} | ${escapeMarkdown(operation.fileName ?? shortPath(operation.sourcePath ?? "File"))} | ${escapeMarkdown(reason)} |`;
    })
    .join("\n");

  return [
    `# Why: ${escapeMarkdown(displayPath)}`,
    "",
    `Mint found **${explanation.totalOperations ?? 0} operations** in ${explanation.batchCount ?? 0} ${explanation.batchCount === 1 ? "activity group" : "activity groups"}.`,
    ...(operationRows
      ? [
          "",
          "## Recent matching activity",
          "",
          "| When | Action | File | Reason |",
          "| --- | --- | --- | --- |",
          operationRows,
        ]
      : ["", "No recent Mint operations involve this path."]),
  ].join("\n");
}
