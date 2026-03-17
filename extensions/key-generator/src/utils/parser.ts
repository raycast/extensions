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
                else if (key === "identityfile")
                    currentConfig.identityFile = value;
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
    const content = configs
        .map((c) => {
            if (c.rawBlock && c.rawBlock.trim() !== "") {
                return c.rawBlock;
            }
            // Generate block if rawBlock is empty (e.g., new entry)
            let block = `Host ${c.host}\n`;
            if (c.hostName) block += `  HostName ${c.hostName}\n`;
            if (c.user) block += `  User ${c.user}\n`;
            if (c.identityFile) block += `  IdentityFile ${c.identityFile}\n`;
            if (c.port) block += `  Port ${c.port}\n`;
            return block;
        })
        .join("\n\n");

    await fs.writeFile(configPath, content, "utf-8");
}
