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

  return newLines.join("\n").trimEnd();
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

function extractNonHostContent(content: string): string {
  const lines = content.split("\n");
  const preserved: string[] = [];
  let inHostBlock = false;

  for (const line of lines) {
    if (inHostBlock) {
      if (/^Host\s+/i.test(line)) {
        continue;
      }

      if (/^[^\s#]/.test(line)) {
        inHostBlock = false;
        preserved.push(line);
        continue;
      }

      continue;
    }

    if (/^Host\s+/i.test(line)) {
      inHostBlock = true;
      continue;
    }

    preserved.push(line);
  }

  return preserved.join("\n").trim();
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
            rawBlock: currentBlock.join("\n"),
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
        rawBlock: currentBlock.join("\n"),
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

  const nonHostContent = extractNonHostContent(originalContent);
  const hostContent = configs
    .map((config) => buildHostBlock(config))
    .filter((block) => block.trim() !== "")
    .join("\n\n")
    .trim();

  const sections = [nonHostContent, hostContent].filter((section) => section.trim() !== "");
  const nextContent = sections.length > 0 ? `${sections.join("\n\n")}\n` : "";

  await fs.mkdir(sshDir, { recursive: true });
  await fs.writeFile(configPath, nextContent, "utf-8");
}
