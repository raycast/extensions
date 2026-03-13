import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { environment } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import { ClientInfo, getClients } from "./getClients";

const execAsync = promisify(exec);

/**
 * Data structure for a successfully created client
 */
export type CreatedClient = {
  name: string;
  clientInstance: Client;
  tools: object;
};

/**
 * Data structure for a failed client
 */
export type ClientError = {
  name: string;
  error: string;
  type: string;
};

/**
 * Result of processing all clients
 */
export type ProcessedClientsResult = {
  clients: CreatedClient[];
  errors: ClientError[];
};

/**
 * Establishes a connection to a MCP Server using StdioClientTransport.
 * Also redirects the server's stderr to the console.
 *
 * @param client - The client instance to connect to
 * @param transport - The transport to use for the connection
 */
async function connectClient(client: Client, transport: StdioClientTransport): Promise<void> {
  console.log("Connecting to client...");

  transport?.stderr?.on("data", (data) => {
    console.log(`MCP Server logs: ${data.toString()}`);
  });

  await client.connect(transport);
  console.log("Connected to client successfully");
}

/**
 * Build an environment object that will be used to spawn the MCP server process.
 * Combines environment variables from the shell and adds critical paths.
 *
 * @returns The environment object with properly configured PATH and other variables
 */
async function buildProcessEnv(): Promise<NodeJS.ProcessEnv> {
  console.log("=== Building process environment ===");

  const shell = process.env.SHELL || "/bin/sh";
  console.debug(`User shell: ${shell}`);

  try {
    const pathCommand = `${shell} -l -c 'echo $PATH'`;
    const { stdout: userPath } = await execAsync(pathCommand);
    const trimmedPath = userPath.trim();
    console.debug(`Retrieved PATH from shell: ${trimmedPath}`);

    const defaultEnv = getDefaultEnvironment();

    return {
      ...defaultEnv,
      PATH: [trimmedPath, "/bin", "/usr/bin", "/opt/homebrew/bin"].join(":"),
      HOME: os.homedir(),
    };
  } catch (error) {
    console.error("Error retrieving shell environment:", error);
    console.log(`Falling back to basic environment`);

    return {
      ...getDefaultEnvironment(),
      PATH: process.env.PATH || "/bin:/usr/bin:/usr/local/bin",
      HOME: os.homedir(),
    };
  }
}

/**
 * Processes a single client by attempting to connect and retrieve tools.
 *
 * @param client - client information
 * @param env - environment variables
 * @returns - processing result (success or error)
 */
async function processClient(
  client: ClientInfo,
  env: NodeJS.ProcessEnv,
): Promise<{ ok: true; data: CreatedClient } | { ok: false; error: ClientError }> {
  console.log(`Processing client: ${JSON.stringify(client, null, 2)}`);

  try {
    const clientInstance = new Client(
      { name: "raycast-ai-client", version: "1.0.0" },
      { capabilities: { prompts: {}, resources: {}, tools: {} } },
    );

    let transport: StdioClientTransport;

    if (client.type === "node") {
      console.log("Connecting to node-type client");
      try {
        const { stdout: nodePath } = await execAsync("which node");
        transport = new StdioClientTransport({
          command: nodePath.trim(),
          args: [client.path ?? ""],
          env: env as Record<string, string>,
          stderr: "pipe",
        });
      } catch (nodeError) {
        console.error("Error with node client:", nodeError);
        return {
          ok: false,
          error: {
            name: client.name,
            error: `Failed to find Node executable: ${nodeError}`,
            type: client.type,
          },
        };
      }
    } else if (client.type === "command") {
      console.log(`Connecting to command-type client: ${JSON.stringify(client.command)}`);
      transport = new StdioClientTransport({
        command: client?.command?.command ?? "",
        args: client?.command?.args ?? [],
        env: env as Record<string, string>,
        stderr: "pipe",
      });
    } else {
      return {
        ok: false,
        error: {
          name: client.name,
          error: `Unsupported client type: ${client.type}`,
          type: client.type,
        },
      };
    }

    await connectClient(clientInstance, transport);

    const tools = await clientInstance.listTools();
    console.debug(`Tools retrieved: ${JSON.stringify(tools, null, 2)}`);

    return {
      ok: true,
      data: {
        name: client.name,
        clientInstance,
        tools,
      },
    };
  } catch (error) {
    console.error(`Connection failed for ${client.name}: ${error}`);
    return {
      ok: false,
      error: {
        name: client.name,
        error: String(error),
        type: client.type,
      },
    };
  }
}

/**
 * Gets a list of all MCP clients, connects to them in parallel,
 * and returns successfully connected clients and errors.
 *
 * @param clientName - (optional) name of a specific client to connect to
 * @returns - Successfully connected clients and connection errors
 */
export default async function getProcessedClients(clientName?: string): Promise<ProcessedClientsResult> {
  console.log("=== Starting getProcessedClients ===");

  const processEnv = await buildProcessEnv();

  const allClients = getClients(environment.supportPath);
  console.log(`Retrieved clients: ${JSON.stringify(allClients, null, 2)}`);

  const filteredClients = allClients.filter((client) => !clientName || client.name === clientName);

  const results = await Promise.all(filteredClients.map((client) => processClient(client, processEnv)));

  const createdClients: CreatedClient[] = [];
  const failedClients: ClientError[] = [];

  for (const result of results) {
    if (result.ok) {
      createdClients.push(result.data);
    } else {
      failedClients.push(result.error);
    }
  }

  return {
    clients: createdClients,
    errors: failedClients,
  };
}
