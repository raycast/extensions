import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { ISSHConnection } from "./types";
import * as fs from "fs";

const preferences = getPreferenceValues();
const sshConfig = preferences.sshConfig.replace("~", process.env.HOME);

function parseSSHConfig(configFilePath: string): ISSHConnection[] {
  const configData = fs.readFileSync(configFilePath, "utf8");
  const configLines = configData.split("\n");

  const connections: ISSHConnection[] = [];
  let currentConnection: ISSHConnection | null = null;

  for (const line of configLines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("#") || trimmedLine === "") {
      continue;
    }

    if (trimmedLine.startsWith("Host ")) {
      if (currentConnection !== null) {
        connections.push(currentConnection);
      }
      currentConnection = { id: connections.length.toString(), address: "", name: trimmedLine.substring(5), user: "" };
    } else if (currentConnection !== null) {
      const [key, value] = trimmedLine.split(/\s+/, 2);

      switch (key) {
        case "HostName":
          currentConnection.address = value;
          break;
        case "User":
          currentConnection.user = value;
          break;
        case "Port":
          currentConnection.port = value;
          break;
        case "IdentityFile":
          currentConnection.sshKey = value;
          break;
        case "HostNameKey":
          // Ignore this key
          break;
        default:
          currentConnection.name = key;
          break;
      }
    }
  }

  if (currentConnection !== null) {
    connections.push(currentConnection);
  }

  return connections;
}

function saveSSHConfig(configFilePath: string, connections: ISSHConnection[]): void {
  let configData = "";

  for (const connection of connections) {
    configData += `Host ${connection.name}\n`;
    configData += `  HostName ${connection.address}\n`;
    configData += `  User ${connection.user}\n`;

    if (connection.port) {
      configData += `  Port ${connection.port}\n`;
    }

    if (connection.sshKey) {
      configData += `  IdentityFile ${connection.sshKey}\n`;
    }

    configData += "\n";
  }

  fs.writeFileSync(configFilePath, configData.trimEnd());
}

export async function getConnections(): Promise<ISSHConnection[]> {
  switch (sshConfig) {
    case "localStorage": {
      const { connections } = await LocalStorage.allItems();
      if (!connections) {
        return [];
      }
      return JSON.parse(connections);
    }
    default: {
      if (!fs.existsSync(sshConfig)) {
        return [];
      }
      const connections = parseSSHConfig(sshConfig);
      return connections;
    }
  }
}

export async function saveConnections(connections: ISSHConnection[]) {
  switch (sshConfig) {
    case "localStorage":
      await LocalStorage.setItem("connections", JSON.stringify(connections));
      break;
    default:
      saveSSHConfig(sshConfig, connections);
      break;
  }
}
