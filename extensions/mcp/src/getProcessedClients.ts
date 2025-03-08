import { getClients } from "./getClients";
import os from "os";
import { execSync } from "child_process";
import { environment } from "@raycast/api";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export default async function (clientName?: string) {
  function getUserShellPath() {
    const shell = os.userInfo().shell || "/bin/sh";
    const command = `${shell} -l -i -c 'echo $PATH'`;

    try {
      const path = execSync(command).toString().trim();
      return path;
    } catch (error) {
      console.error("Error retrieving shell PATH:", error);
      return process.env.PATH || "";
    }
  }

  process.env.PATH = getUserShellPath();

  const clients = getClients(environment.supportPath);

  const createdClients: { name: string; clientInstance: Client; tools: object }[] = [];

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
