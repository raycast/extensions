import { copyFile, readFile, writeFile } from "fs/promises";
import { constants } from "fs";
import { aerospace, resolveConfigPath } from "./aerospace";

export type WindowRuleState = {
  exists: boolean;
  floating: boolean;
  workspace: string;
};

type RuleBlock = {
  start: number;
  end: number;
  lines: string[];
};

function blocks(lines: string[]): RuleBlock[] {
  const starts = lines
    .map((line, index) => (line.trim() === "[[on-window-detected]]" ? index : -1))
    .filter((index) => index >= 0);
  return starts.map((start, index) => ({
    start,
    end: starts[index + 1] ?? lines.length,
    lines: lines.slice(start, starts[index + 1] ?? lines.length),
  }));
}

function appIdForBlock(block: RuleBlock): string | null {
  for (const line of block.lines) {
    const match = line.match(/^\s*if\.app-id\s*=\s*(['"])(.*?)\1\s*$/);
    if (match) return match[2];
  }
  return null;
}

function commandsForBlock(block: RuleBlock): string[] {
  const runIndex = block.lines.findIndex((line) => /^\s*run\s*=/.test(line));
  if (runIndex < 0) return [];

  const line = block.lines[runIndex];
  const value = line.slice(line.indexOf("=") + 1).trim();
  if (!value) return [];
  if (value.startsWith("[") && !value.endsWith("]")) {
    throw new Error(
      "This application already has a multiline window rule. Edit it manually to avoid losing custom commands.",
    );
  }
  const quoted = [...value.matchAll(/(['"])(.*?)\1/g)].map((match) => match[2]);
  return quoted.length ? quoted : [value.replace(/^['"]|['"]$/g, "")];
}

async function configFile(): Promise<string> {
  const path = await resolveConfigPath();
  if (!path) {
    throw new Error(
      "No custom AeroSpace configuration was found. Create one or select it in extension preferences.",
    );
  }
  return path;
}

export async function readWindowRule(bundleId: string): Promise<WindowRuleState> {
  const path = await configFile();
  const content = await readFile(path, "utf8");
  const block = blocks(content.split(/\r?\n/)).find(
    (candidate) => appIdForBlock(candidate) === bundleId,
  );
  if (!block) return { exists: false, floating: false, workspace: "" };

  const commands = commandsForBlock(block);
  const workspaceCommand = commands.find((command) =>
    command.startsWith("move-node-to-workspace "),
  );
  return {
    exists: true,
    floating: commands.includes("layout floating"),
    workspace: workspaceCommand?.slice("move-node-to-workspace ".length) || "",
  };
}

export async function saveWindowRule(options: {
  bundleId: string;
  appName: string;
  floating: boolean;
  workspace: string;
}): Promise<{ stdout: string; stderr: string }> {
  const path = await configFile();
  const content = await readFile(path, "utf8");
  const lines = content.split(/\r?\n/);
  const existing = blocks(lines).find((candidate) => appIdForBlock(candidate) === options.bundleId);
  const preservedCommands = existing
    ? commandsForBlock(existing).filter(
        (command) =>
          command !== "layout floating" && !command.startsWith("move-node-to-workspace "),
      )
    : [];
  const commands = [
    ...(options.workspace ? [`move-node-to-workspace ${options.workspace}`] : []),
    ...(options.floating ? ["layout floating"] : []),
    ...preservedCommands,
  ];

  const safeName = options.appName.replace(/[\r\n]+/g, " ").trim();
  const newBlock =
    commands.length === 0
      ? []
      : [
          `# Managed by AeroSpace Control Center: ${safeName}`,
          "[[on-window-detected]]",
          `if.app-id = ${JSON.stringify(options.bundleId)}`,
          commands.length === 1
            ? `run = ${JSON.stringify(commands[0])}`
            : `run = [${commands.map((command) => JSON.stringify(command)).join(", ")}]`,
          "",
        ];

  if (existing) {
    let start = existing.start;
    if (start > 0 && lines[start - 1].startsWith("# Managed by AeroSpace Control Center:")) {
      start -= 1;
    }
    lines.splice(start, existing.end - start, ...newBlock);
  } else if (newBlock.length) {
    if (lines.at(-1)?.trim()) lines.push("");
    lines.push(...newBlock);
  }

  const backupPath = `${path}.raycast-backup`;
  await copyFile(path, backupPath, constants.COPYFILE_EXCL).catch((error) => {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;
  });
  await writeFile(path, `${lines.join("\n").trimEnd()}\n`, "utf8");
  await aerospace(["reload-config"]);
  return {
    stdout: `Saved rule for ${safeName}. Backup: ${backupPath}`,
    stderr: "",
  };
}
