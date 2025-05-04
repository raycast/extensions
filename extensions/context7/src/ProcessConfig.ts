import { getClients } from "./Context7config";
import os from "os";
import { execSync } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export default async function (clientName?: string) {
  function initEnv() {
    const shell = os.userInfo().shell || "/bin/sh";
    const command = `LC_ALL=en_US.UTF-8 ${shell} -L -i -c 'printenv'`;
    try {
      const variables = execSync(command, { encoding: "utf8" });
      variables.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
          process.env[key] = value;
        }
      });
    } catch (error) {
      console.error("Error retrieving shell PATH:", error);
      process.env.PATH = process.env.PATH || "";
    }
  }
  initEnv();

  function getUserShellPath() {
    const shell = os.userInfo().shell || "/bin/sh";
    const command = `${shell} -l -c 'echo $PATH'`;

    try {
      const path = execSync(command).toString().trim();
      return path;
    } catch (error) {
      console.error("Error retrieving shell PATH:", error);
      return process.env.PATH || "";
    }
  }

  process.env.PATH = getUserShellPath();

  const clients = getClients();

  const createdClients: {
    name: string;
    clientInstance: Client;
    tools: object;
  }[] = [];

  for (const client of clients) {
    if (!clientName || client.name == clientName) {
      const raycastAiClientInstance = new Client(
        {
          name: "raycast-ai-client",
          version: "1.0.0",
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        },
      );

      if (client.type == "node") {
        const nodePath = execSync("which node").toString().trim();
        const transport = new StdioClientTransport({
          command: nodePath,
          args: [client.path || ""],
        });
        await raycastAiClientInstance.connect(transport);
      }
      if (client.type == "command") {
        const transport = new StdioClientTransport(client.command!);
        await raycastAiClientInstance.connect(transport);
      }

      createdClients.push({
        name: client.name,
        clientInstance: raycastAiClientInstance,
        tools: await raycastAiClientInstance.listTools(),
      });
    }
  }

  return createdClients;
}
