import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { environment } from "@raycast/api";
import { execSync } from "child_process";
import os from "os";
import { getClients } from "./getClients";

/**
 * Establishes a connection to a MCP Server using StdioClientTransport.
 * Also redirects the server's stderr to the console.
 *
 * @param raycastAiClientInstance - The client instance to connect to
 * @param transport - The transport to use for the connection
 */
async function connectClient(raycastAiClientInstance: Client, transport: StdioClientTransport) {
  console.log("Connecting to client...");
  const connectPromise = raycastAiClientInstance.connect(transport);
  transport?.stderr?.on("data", (data) => {
    console.log(`MCP Server logs: ${data.toString()}`);
  });

  await connectPromise;
  console.log("Connected to client successfully");
}

/**
 * Build an environment object that will be used to spawn the MCP server process.
 * Combines environment variables from the shell and adds critical paths.
 *
 * @returns The environment object with properly configured PATH and other variables
 */
function buildProcessEnv() {
  console.log("=== Building process environment ===");

  // Get user's shell
  const shell = os.userInfo().shell || "/bin/sh";
  console.debug(`User shell: ${shell}`);

  // Get environment variables from shell
  try {
    // Get PATH from shell
    const pathCommand = `${shell} -l -i -c 'echo $PATH'`;
    const userPath = execSync(pathCommand).toString().trim();
    console.debug(`Retrieved PATH from shell: ${userPath}`);

    // Get base environment
    const defaultEnv = getDefaultEnvironment();

    // Create environment with critical paths added
    return {
      ...defaultEnv,
      PATH: `/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:${userPath}`,
      HOME: os.homedir(),
    };
  } catch (error) {
    console.error("Error retrieving shell environment:", error);
    console.log(`Falling back to basic environment`);

    // Fallback to basic environment
    return {
      ...getDefaultEnvironment(),
      PATH: process.env.PATH || "/bin:/usr/bin:/usr/local/bin",
      HOME: os.homedir(),
    };
  }
}

export default async function (clientName?: string) {
  console.log("=== Starting getProcessedClients ===");

  const processEnv = buildProcessEnv();
  const clients = getClients(environment.supportPath);

  console.log(`Retrieved clients: ${JSON.stringify(clients, null, 2)}`);

  const createdClients: { name: string; clientInstance: Client; tools: object }[] = [];

  for (const client of clients) {
    console.log(`Processing client: ${JSON.stringify(client, null, 2)}`);

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
        console.log("Connecting to node-type client");
        try {
          const nodePath = execSync("which node").toString().trim();
          await connectClient(
            raycastAiClientInstance,
            new StdioClientTransport({
              command: nodePath,
              args: [client.path ?? ""],
              env: processEnv,
              stderr: "pipe",
            }),
          );
        } catch (nodeError) {
          console.error("Error with node client:", nodeError);
        }
      }

      if (client.type == "command") {
        console.log(`Connecting to command-type client: ${JSON.stringify(client.command)}`);
        try {
          await connectClient(
            raycastAiClientInstance,
            new StdioClientTransport({
              command: client?.command?.command ?? "",
              args: client?.command?.args ?? [],
              env: processEnv,
              stderr: "pipe",
            }),
          );

          const tools = await raycastAiClientInstance.listTools();
          console.debug(`Tools retrieved: ${JSON.stringify(tools, null, 2)}`);

          createdClients.push({
            name: client.name,
            clientInstance: raycastAiClientInstance,
            tools: tools,
          });
        } catch (error) {
          console.error(`Connection failed: ${error}`);
          throw error;
        }
      }
    }
  }

  return createdClients;
}
