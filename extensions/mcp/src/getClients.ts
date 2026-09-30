import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export type ClientInfo = {
  type: string;
  path?: string;
  command?: {
    command: string;
    args: string[];
  };
  name: string;
  ready: boolean;
};

export function getClients(supportPath: string): ClientInfo[] {
  const serversPath = join(supportPath, "servers");

  const mcpConfigPath = join(serversPath, "mcp-config.json");
  if (!existsSync(mcpConfigPath)) {
    const initialConfig = { mcpServers: {} };
    mkdirSync(serversPath, { recursive: true });
    writeFileSync(mcpConfigPath, JSON.stringify(initialConfig, null, 2), "utf-8");
  }
  let mcpServers: { [serverName: string]: { command: string; args: string[] } } = {};

  if (existsSync(mcpConfigPath)) {
    const configFile = readFileSync(mcpConfigPath, "utf-8");
    mcpServers = JSON.parse(configFile).mcpServers;
  }

  const clients: ClientInfo[] = [];

  for (const serverName in mcpServers) {
    clients.push({
      type: "command",
      command: mcpServers[serverName],
      name: serverName,
      ready: true,
    });
  }

  if (!existsSync(serversPath)) {
    mkdirSync(serversPath);
    return [];
  } else {
    const folderList = readdirSync(serversPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    folderList.forEach((folder) => {
      const folderPath = join(serversPath, folder);
      const nodeModulesPath = join(folderPath, "node_modules");

      const indexPath = join(folderPath, "index.js");
      const packageJsonPath = join(folderPath, "package.json");

      if (existsSync(indexPath) && existsSync(packageJsonPath)) {
        // it's a Node client!
        if (!existsSync(nodeModulesPath)) {
          execSync("npm i", { cwd: folderPath, env: { ...process.env } });
        }
        clients.push({
          type: "node",
          path: indexPath,
          name: folder,
          ready: true,
        });
      } else {
        clients.push({
          type: "unknown",
          path: indexPath,
          name: folder,
          ready: false,
        });
      }
    });

    return clients;
  }
}
