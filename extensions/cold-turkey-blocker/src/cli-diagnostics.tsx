import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getBlockStatusWithRetry, getCliContext, getCliHelp, runColdTurkey, type BlockInfo } from "./lib/cold-turkey";
import { blockKindLabel, cleanCliOutput, parseBlockList } from "./lib/cli-output";
import { formatCliError } from "./lib/ui";

interface DiagnosticsResult {
  context: ReturnType<typeof getCliContext>;
  helpOutput?: string;
  listOutput?: string;
  blocks: BlockInfo[];
  errors: string[];
}

export default function CliDiagnosticsCommand() {
  const { data, isLoading, revalidate } = usePromise(loadDiagnostics);
  const markdown = data ? buildReport(data) : "# Cold Turkey CLI Diagnostics\n\nLoading…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Diagnostics"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          {data ? (
            <Action.CopyToClipboard title="Copy Full Diagnostic Report" content={buildPlainTextReport(data)} />
          ) : null}
          {data?.context ? (
            <Action.CopyToClipboard title="Copy Executable Path" content={data.context.executablePath} />
          ) : null}
          {data?.helpOutput ? <Action.CopyToClipboard title="Copy CLI Help" content={data.helpOutput} /> : null}
          {data?.listOutput ? <Action.CopyToClipboard title="Copy Raw Block List" content={data.listOutput} /> : null}
          <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

async function loadDiagnostics(): Promise<DiagnosticsResult> {
  const context = getCliContext();
  const errors: string[] = [];
  let helpOutput: string | undefined;
  let listOutput: string | undefined;
  const blocks: BlockInfo[] = [];

  try {
    const result = await getCliHelp();
    helpOutput = cleanCliOutput(result.output);
  } catch (error) {
    errors.push(`-help: ${formatCliError(error, 1_200)}`);
  }

  try {
    const result = await runColdTurkey(["-list-blocks"]);
    listOutput = cleanCliOutput(result.output);
    const descriptors = parseBlockList(listOutput);

    for (const descriptor of descriptors) {
      blocks.push(await getBlockStatusWithRetry(descriptor, { attempts: 2 }));
    }
  } catch (error) {
    errors.push(`-list-blocks/status: ${formatCliError(error, 1_200)}`);
  }

  return { context, helpOutput, listOutput, blocks, errors };
}

function buildReport(data: DiagnosticsResult): string {
  const version = parseVersion(data.helpOutput);
  const enabled = data.blocks.filter((block) => block.state === "enabled").length;
  const disabled = data.blocks.filter((block) => block.state === "disabled").length;
  const unknown = data.blocks.filter((block) => block.state === "unknown").length;

  const lines = [
    "# Cold Turkey CLI Diagnostics",
    "",
    "> Read-only check: this command only runs `-help`, `-list-blocks`, and `-status`. It never creates, starts, stops, or locks a block.",
    "",
    `- **Platform:** ${escapeMarkdown(data.context.platform)}`,
    `- **Cold Turkey version:** ${escapeMarkdown(version ?? "Could not determine")}`,
    `- **Executable exists:** ${data.context.executableExists ? "Yes" : "No"}`,
    `- **Timeout:** ${data.context.timeoutMs} ms per CLI process`,
    `- **Parsed blocks:** ${data.blocks.length}`,
    `- **Statuses:** ${enabled} enabled, ${disabled} disabled, ${unknown} unknown`,
    "- **Execution mode:** serialized; statuses checked one block at a time",
    "- **Executable:**",
    "",
    codeBlock(data.context.executablePath),
  ];

  if (data.errors.length > 0) {
    lines.push("", "## Errors", "", ...data.errors.map((error) => `- ${escapeMarkdown(error)}`));
  }

  lines.push("", "## Parsed Blocks and Statuses", "");
  if (data.blocks.length === 0) {
    lines.push("No blocks were parsed.");
  } else {
    lines.push("| Block | Type | Status | Raw `-status` output |", "|---|---|---|---|");
    for (const block of data.blocks) {
      lines.push(
        `| ${escapeTable(block.name)} | ${escapeTable(blockKindLabel(block.kind))} | ${escapeTable(block.state)} | ${escapeTable(block.rawStatus || "(no output)")} |`,
      );
    }
  }

  lines.push(
    "",
    "## Raw `-list-blocks` Output",
    "",
    codeBlock(data.listOutput ?? "No block-list output was returned."),
    "",
    "## Native `-help` Output",
    "",
    codeBlock(data.helpOutput ?? "No CLI help output was returned."),
  );

  if (data.context.platform === "Windows") {
    lines.push(
      "",
      "> On Windows, close the Blocker window and choose **Exit** from its system-tray icon before using CLI-backed commands.",
    );
  }

  return lines.join("\n");
}

function buildPlainTextReport(data: DiagnosticsResult): string {
  const rows = data.blocks.map(
    (block) => `${block.name}\t${blockKindLabel(block.kind)}\t${block.state}\t${block.rawStatus || "(no output)"}`,
  );
  return [
    "Cold Turkey CLI Diagnostics",
    `Platform: ${data.context.platform}`,
    `Version: ${parseVersion(data.helpOutput) ?? "unknown"}`,
    `Executable: ${data.context.executablePath}`,
    `Timeout: ${data.context.timeoutMs} ms`,
    "Execution: serialized status iteration",
    data.errors.length ? `Errors:\n${data.errors.join("\n")}` : "Errors: none",
    "",
    "Block\tType\tStatus\tRaw status",
    ...rows,
    "",
    "Raw -list-blocks output:",
    data.listOutput ?? "(none)",
    "",
    "Native -help output:",
    data.helpOutput ?? "(none)",
  ].join("\n");
}

function parseVersion(helpOutput?: string): string | undefined {
  return helpOutput?.match(/Cold Turkey Blocker\s*\[Version\s+([^\]]+)\]/i)?.[1]?.trim();
}

function codeBlock(value: string): string {
  return "```text\n" + value.replace(/```/g, "` ` `") + "\n```";
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ↵ ");
}
