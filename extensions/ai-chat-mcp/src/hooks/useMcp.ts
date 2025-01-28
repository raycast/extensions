import { useEffect, useState, useCallback } from "react";
import { environment, showToast, Toast } from "@raycast/api";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
  ListToolsResult,
  CallToolResult,
  ListToolsResultSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "node:path";

export type McpServer = {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  client: Client | null;
  tools: Tool[];
  isConnected: boolean;
};

type McpConfig = Record<string, Omit<McpServer, "id" | "client" | "tools" | "isConnected">>;

const configPath = path.join(environment.supportPath, "config.json");

export function useMcp() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      const parsedConfig: { mcpServers: McpConfig } = JSON.parse(content);

      const loadedServers: McpServer[] = Object.entries(parsedConfig.mcpServers).map(([id, config]) => ({
        id,
        ...config,
        client: null,
        tools: [],
        isConnected: false,
      }));

      setServers(loadedServers);
    } catch (error) {
      console.error("Error reading MCP config:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error reading MCP config",
        message: String(error),
      });
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, []);

  const connectToServer = useCallback(async (server: McpServer) => {
    const defaultEnv = getDefaultEnvironment();
    const HOME = process.env.HOME ?? "";

    // Common paths for CLI tools and binaries on macOS
    const paths = [
      `${HOME}/.volta/bin`, // Volta binaries
      `${HOME}/.config/yarn/global/node_modules/.bin`, // Yarn global binaries
      `${HOME}/.bun/bin`, // Bun binaries
      `${HOME}/.npm-global/bin`, // npm global binaries
      `${HOME}/.cargo/bin`, // Rust/Cargo binaries
      "/opt/homebrew/bin", // Apple Silicon Homebrew
      "/opt/homebrew/sbin",
      "/usr/local/bin", // Intel Homebrew & system bins
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
      "/Library/Apple/usr/bin",
      `${HOME}/.orbstack/bin`, // docker via orbstack
      `${HOME}/.local/bin`, // User local binaries
      `${HOME}/go/bin`, // Go binaries
    ].filter(Boolean);

    const subprocessEnv = {
      ...defaultEnv,
      PATH: paths.join(":"),
      ...(server.env || {}),
    };

    console.log(`Attempting to connect to ${server.id} with command:`, {
      command: server.command,
      args: server.args,
      PATH: subprocessEnv.PATH,
    });

    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args,
      stderr: "pipe",
      env: subprocessEnv,
    });

    transport.stderr?.on("data", (data) => {
      console.error(`[${server.id}] Process stderr:`, data.toString());
    });

    const client = new Client(
      {
        name: "raycast-ai-chat",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    const listToolsResult = await client.request({ method: "tools/list" }, ListToolsResultSchema);

    if (!listToolsResult) {
      throw new Error("Failed to list tools");
    }

    const tools = (listToolsResult as { tools: Tool[] }).tools;

    setServers((prevServers) =>
      prevServers.map((s) => (s.id === server.id ? { ...s, client, tools, isConnected: true } : s))
    );

    return tools;
  }, []);

  useEffect(() => {
    const connectToServers = async () => {
      setIsConnecting(true);

      try {
        const connectionPromises = servers.map(async (server) => {
          if (!server.isConnected) {
            console.log("[connecting to server]", server.id);
            try {
              const tools = await connectToServer(server);
              return { success: true, server, tools };
            } catch (error) {
              return { success: false, server, error };
            }
          }
          return { success: true, server, tools: server.tools };
        });

        const results = await Promise.all(connectionPromises);

        const totalTools = results.reduce((sum, result) => {
          if (result.success) {
            return sum + (result.tools?.length || 0);
          }
          return sum;
        }, 0);

        results.forEach((result) => {
          if (!result.success) {
            console.error(`Failed to connect to ${result.server.id}:`, result.error);
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to connect to ${result.server.id}`,
              message: result.error instanceof Error ? result.error.message : String(result.error),
            });
          }
        });

        const successfulConnections = results.filter((r) => r.success).length;
        if (successfulConnections > 0) {
          showToast({
            style: Toast.Style.Success,
            title: `Connected to ${successfulConnections} server${successfulConnections > 1 ? "s" : ""}`,
            message: `Found ${totalTools} tool${totalTools !== 1 ? "s" : ""} in total`,
          });
        }
      } finally {
        setIsConnecting(false);
      }
    };

    connectToServers();

    return () => {
      if (servers.length > 0) {
        console.log("[disconnecting from all servers]");
        servers.forEach((server) => {
          if (server.isConnected) {
            server.client?.close();
            server.client?.transport?.close();
          }
        });
      }
    };
  }, [servers.length, connectToServer]);

  const callTool = useCallback(
    async (serverId: string, toolName: string, toolArguments: unknown): Promise<CallToolResult> => {
      const server = servers.find((s) => s.id === serverId);
      if (!server || !server.client) {
        throw new Error(`MCP server not found or not connected: ${serverId}`);
      }

      const request = {
        method: "tools/call" as const,
        params: {
          name: toolName,
          arguments: toolArguments,
        },
      };

      const requestStr = JSON.stringify(request.params.arguments);
      console.log(`\n[-> ${toolName} ${requestStr}]`);
      const result = await server.client.request(request, CallToolResultSchema);
      const resultStr = JSON.stringify(result);
      const truncatedResult = resultStr.length > 500 ? resultStr.slice(0, 500) + "..." : resultStr;
      console.log(`[<- ${toolName} ${truncatedResult}]\n`);

      if (!result) {
        throw new Error("Failed to call tool");
      }

      return result as unknown as CallToolResult;
    },
    [servers]
  );

  return { servers, callTool, loadConfig, isConnecting };
}
