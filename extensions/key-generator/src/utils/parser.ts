import fs from "fs/promises";
import path from "path";
import os from "os";

export interface SSHHostConfig {
  host: string;
  hostName?: string;
  user?: string;
  identityFile?: string;
  port?: string;
  rawBlock: string;
}

export function updateRawBlock(rawBlock: string, values: Omit<SSHHostConfig, "rawBlock">): string {
  const lines = rawBlock.split("\n");
  const keysToUpdate = [
    { key: "Host", value: values.host },
    { key: "HostName", value: values.hostName },
    { key: "User", value: values.user },
    { key: "IdentityFile", value: values.identityFile },
    { key: "Port", value: values.port },
  ];

  const processedKeys = new Set<string>();
  const newLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") {
      newLines.push(line);
      continue;
    }

    const parts = trimmed.split(/\s+/);
    const lineKey = parts[0].toLowerCase();

    const updateItem = keysToUpdate.find((k) => k.key.toLowerCase() === lineKey);
    if (updateItem) {
      processedKeys.add(updateItem.key);
      if (updateItem.value && updateItem.value.trim() !== "") {
        const indentMatch = line.match(/\S/);
        const indent = indentMatch ? line.substring(0, indentMatch.index) : "";
        newLines.push(`${indent}${updateItem.key} ${updateItem.value}`);
      }
    } else {
      newLines.push(line);
    }
  }

  const hostIndex = newLines.findIndex((line) => line.trim().toLowerCase().startsWith("host "));
  const actualInsertIndex = hostIndex >= 0 ? hostIndex + 1 : newLines.length;

  const addedLines = [];
  for (const item of keysToUpdate) {
    if (item.key !== "Host" && !processedKeys.has(item.key) && item.value && item.value.trim() !== "") {
      addedLines.push(`  ${item.key} ${item.value}`);
    }
  }

  newLines.splice(actualInsertIndex, 0, ...addedLines);

  return newLines.join("\n");
}

function buildHostBlock(config: SSHHostConfig): string {
  if (config.rawBlock && config.rawBlock.trim() !== "") {
    return config.rawBlock;
  }

  let block = `Host ${config.host}\n`;
  if (config.hostName) block += `  HostName ${config.hostName}\n`;
  if (config.user) block += `  User ${config.user}\n`;
  if (config.identityFile) block += `  IdentityFile ${config.identityFile}\n`;
  if (config.port) block += `  Port ${config.port}\n`;
  return block.trimEnd();
}

function normalizeRawBlock(blockLines: string[]): string {
  return blockLines.join("\n");
}

function findHostBlockRanges(lines: string[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let index = 0;

  while (index < lines.length) {
    if (!/^Host\s+/i.test(lines[index])) {
      index += 1;
      continue;
    }

    const start = index;
    index += 1;

    while (index < lines.length) {
      const line = lines[index];
      if (/^Host\s+/i.test(line)) {
        break;
      }

      if (/^[^\s#]/.test(line)) {
        break;
      }

      index += 1;
    }

    ranges.push({ start, end: index });
  }

  return ranges;
}

function mergeHostBlocksPreservingOrder(originalContent: string, hostBlocks: string[]): string {
  const lines = originalContent.split("\n");
  const ranges = findHostBlockRanges(lines);

  if (ranges.length === 0) {
    const sections = [originalContent.trim(), hostBlocks.join("\n\n").trim()].filter((section) => section !== "");
    return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
  }

  const outputLines: string[] = [];
  let cursor = 0;

  for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += 1) {
    const range = ranges[rangeIndex];
    outputLines.push(...lines.slice(cursor, range.start));

    if (rangeIndex < hostBlocks.length) {
      outputLines.push(...hostBlocks[rangeIndex].split("\n"));
    }

    cursor = range.end;
  }

  outputLines.push(...lines.slice(cursor));

  if (hostBlocks.length > ranges.length) {
    const extraBlocks = hostBlocks.slice(ranges.length).join("\n\n");
    if (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() !== "") {
      outputLines.push("");
    }
    outputLines.push(...extraBlocks.split("\n"));
  }

  const merged = outputLines.join("\n").trimEnd();
  return merged !== "" ? `${merged}\n` : "";
}

export async function parseSSHConfig(): Promise<SSHHostConfig[]> {
  const configPath = path.join(os.homedir(), ".ssh", "config");

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const lines = content.split("\n");

    const configs: SSHHostConfig[] = [];
    let currentConfig: Partial<SSHHostConfig> | null = null;
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("#") || trimmed === "") {
        if (currentConfig) currentBlock.push(line);
        continue;
      }

      const parts = trimmed.split(/\s+/);
      const key = parts[0].toLowerCase();
      const value = parts.slice(1).join(" ");

      if (key === "host") {
        if (currentConfig && currentConfig.host) {
          configs.push({
            host: currentConfig.host,
            hostName: currentConfig.hostName,
            user: currentConfig.user,
            identityFile: currentConfig.identityFile,
            port: currentConfig.port,
            rawBlock: normalizeRawBlock(currentBlock),
          });
        }
        currentConfig = { host: value };
        currentBlock = [line];
      } else if (currentConfig) {
        currentBlock.push(line);
        if (key === "hostname") currentConfig.hostName = value;
        else if (key === "user") currentConfig.user = value;
        else if (key === "identityfile") currentConfig.identityFile = value;
        else if (key === "port") currentConfig.port = value;
      }
    }

    if (currentConfig && currentConfig.host) {
      configs.push({
        host: currentConfig.host,
        hostName: currentConfig.hostName,
        user: currentConfig.user,
        identityFile: currentConfig.identityFile,
        port: currentConfig.port,
        rawBlock: normalizeRawBlock(currentBlock),
      });
    }

    return configs;
  } catch (error) {
    if ((error as Error & { code?: string }).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function saveSSHConfig(configs: SSHHostConfig[]): Promise<void> {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  const sshDir = path.dirname(configPath);
  let originalContent = "";

  try {
    originalContent = await fs.readFile(configPath, "utf-8");
  } catch (error) {
    if ((error as Error & { code?: string }).code !== "ENOENT") {
      throw error;
    }
  }

  const hostBlocks = configs.map((config) => buildHostBlock(config)).filter((block) => block.trim() !== "");

  const nextContent = mergeHostBlocksPreservingOrder(originalContent, hostBlocks);

  await fs.mkdir(sshDir, { recursive: true });
  const tmpPath = `${configPath}.raycast-tmp`;
  await fs.writeFile(tmpPath, nextContent, { encoding: "utf-8", mode: 0o600 });
  await fs.rename(tmpPath, configPath);
}
