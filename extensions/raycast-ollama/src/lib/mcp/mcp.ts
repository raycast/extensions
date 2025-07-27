import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServerConfig, McpServerTool, McpToolInfo } from "./types";
import { execSync } from "child_process";
import os from "os";
import { OllamaApiChatMessageToolCall, OllamaApiTool } from "../ollama/types";
import { ConvertMcpToolsToOllamaTools } from "./utils";

// Mcp Client with multiple Mcp Server support.
export class McpClientMultiServer {
  /* Mcp Client Map where the key is the Mcp Server Name. */
  private _client = new Map<string, McpClient>();

  /* Tools Map where key is the modified tool name and the value is the Mcp Server name. */
  private _clientToolsFunctionNames = new Map<string, string>();

  /* Tools Cache where the key is the Mcp Server Name. Tools are saved with the modified names. */
  private _cacheTools = new Map<string, McpServerTool[]>();
  private _cacheToolsOllama = new Map<string, OllamaApiTool[]>();

  /**
   * @param config - Mcp Config.
   * @param initEnvsPath - Set to false for skip envs and path initialization.
   */
  constructor(config: McpServerConfig, initEnvsPath = true) {
    /* Get Mcp Server names. */
    const serverNames = Object.keys(config.mcpServers);
    if (serverNames.length === 0) throw new Error("MCP configuration must contain at least one server");

    /* Initialize a client for each Mcp Server. */
    serverNames.forEach((server) => {
      this._client.set(server, new McpClient(config.mcpServers[server], initEnvsPath));
      if (initEnvsPath) initEnvsPath = false;
    });
  }

  /**
   * Rename Tools Function Name avoiding name collision between Mcp Server functions names.
   * All news names are saved on _clientToolsMap.
   * @param server - Mcp Server name.
   * @param tools - Tools array.
   * @returns Tools with the new names.
   */
  private _renameToolsFunctionName(server: string, tools: McpServerTool[]): McpServerTool[] {
    return tools.map((tool) => {
      const name = `${server}_${tool.name}`;
      tool.name = name;
      if (!this._clientToolsFunctionNames.has(name)) this._clientToolsFunctionNames.set(name, server);
      return tool;
    });
  }

  /**
   * Restore Tools Function Name to the original one.
   * @param server - Mcp Server name.
   * @param tools - Tools array.
   * @returns Tools with the original names.
   */
  private _restoreToolsFunctionName(
    server: string,
    tools: OllamaApiChatMessageToolCall[]
  ): OllamaApiChatMessageToolCall[] {
    return tools.map((tool) => {
      const name = tool.function.name.replace(new RegExp(`^${server}_`), "");
      tool.function.name = name;
      return tool;
    });
  }

  /**
   * Get Tools from configured Mcp Server.
   * @param use_cache - disable tools cache.
   * @param server - mcp server names. Use only if you need to limit tools retrieve.
   */
  async GetTools(use_cache = true, server: string[] = [...this._client.keys()]): Promise<McpServerTool[]> {
    let tools: McpServerTool[] = [];

    /* Get Tools from Mcp Server. */
    const tasks = await Promise.all(
      server.map(async (name): Promise<McpServerTool[] | undefined> => {
        /* Get Tools from cache if defined and cache is enabled */
        if (use_cache && this._cacheTools.has(name)) return this._cacheTools.get(name);

        /* Get Tools */
        if (this._client.has(name)) {
          try {
            const tools = await this._client
              .get(name)!
              .GetTools(false)
              .then((t) => this._renameToolsFunctionName(name, t));

            if (tools.length > 0) {
              /* Save Tools on cache */
              this._cacheTools.set(name, tools);
              return tools;
            }
          } catch (e) {
            console.error(`[ERROR] Mcp Client - Server Name: "${name}" - Error: "${e}"`);
          }
        }

        /* Return undefined if Mcp Server name is not configured */
        return undefined;
      })
    );

    // Concat all defined result.
    tasks.forEach((task) => {
      if (task) tools = tools.concat(task);
    });

    return tools;
  }

  /**
   * Get Tools from configured Mcp Server in Ollama format.
   * @param use_cache - disable tools cache.
   * @param server - mcp server names. Use only if you need to limit tools retrieve.
   */
  async GetToolsOllama(use_cache = true, server: string[] = [...this._client.keys()]): Promise<OllamaApiTool[]> {
    let tools: OllamaApiTool[] = [];

    /* Get Tools from Mcp Server. */
    const tasks = await Promise.all(
      server.map(async (name): Promise<OllamaApiTool[] | undefined> => {
        /* Get Tools from cacheToolsOllama if defined and cache is enabled */
        if (use_cache && this._cacheToolsOllama.has(name)) return this._cacheToolsOllama.get(name)!;

        /* Get Tools from Mcp Server and save on cache */
        const t = ConvertMcpToolsToOllamaTools(await this.GetTools(use_cache, [name]));
        if (t.length > 0) {
          this._cacheToolsOllama.set(name, t);
          return t;
        }

        return undefined;
      })
    );

    /* Concat all defined result. */
    tasks.forEach((task) => {
      if (task) tools = tools.concat(task);
    });

    return tools;
  }

  /**
   * Get Tools info.
   * @param tools - Tools in Ollama Format.
   */
  GetToolsInfoForOllama(tools: OllamaApiChatMessageToolCall[]): McpToolInfo[] {
    const o: McpToolInfo[] = [];

    tools.forEach((t) => {
      /* Get Mcp Server Name */
      const server = this._clientToolsFunctionNames.get(t.function.name);
      if (!server) return;

      /* Get Original function Name */
      const name = t.function.name.replace(new RegExp(`^${server}_`), "");

      o.push({
        server: server,
        function: name,
        arguments: t.function.arguments,
      });
    });

    return o;
  }

  /**
   * Call Tools on Mcp Server.
   * @param tools - Tools Call on Ollama Format,
   * @returns Tools call results array.
   */
  async CallToolsForOllama(tools: OllamaApiChatMessageToolCall[]): Promise<any[]> {
    let results: any[] = [];

    /* Aggregate tool call by mcp server */
    const toolsMap = new Map<string, OllamaApiChatMessageToolCall[]>();
    tools.forEach((tool) => {
      /* Get Mcp Server Name */
      const name = this._clientToolsFunctionNames.get(tool.function.name);
      if (!name) return;

      /* Add tool to toolsMap */
      toolsMap.has(name) ? toolsMap.get(name)!.push(tool) : toolsMap.set(name, [tool]);
    });

    const tasks = await Promise.all(
      [...toolsMap.keys()].map(async (name): Promise<any[] | undefined> => {
        /* Get Mcp Client and Tools */
        const client = this._client.get(name)!;
        const tools = this._restoreToolsFunctionName(name, toolsMap.get(name)!);

        /* Call Tools */
        try {
          return await client.CallToolsForOllama(tools);
        } catch (e) {
          console.error(`[ERROR] Mcp Client - Server Name: "${name}" - Error: "${e}"`);
        }

        return undefined;
      })
    );

    /* Concat all defined result. */
    tasks.forEach((task) => {
      if (task) results = results.concat(task);
    });

    return results;
  }
}

/* Mcp Client with single Mcp Server support. */
export class McpClient {
  private _client: Client;
  private _connected = false;

  private _config: StdioServerParameters;

  private _tools: McpServerTool[] | undefined;
  private _ollamaTools: OllamaApiTool[] | undefined;

  /**
   * @param config - Mcp Config, only local server are supported.
   * @param initEnvsPath - Set to false for skip envs and path initialization.
   */
  constructor(config: StdioServerParameters, initEnvsPath = true) {
    /* Mcp Client Config. */
    this._client = new Client(
      {
        name: "raycast-extension-ollama",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this._client.onclose = () => (this._connected = false);

    /* Initiliazie $PATH and global ENVS. */
    if (initEnvsPath) {
      this._initEnvs();
      this._initPaths();
    }

    /* Save Stdio Config */
    this._config = config;
  }

  /*
   * Add user defined envs on process.env.
   */
  private _initEnvs(): void {
    const shell = os.userInfo().shell || "/bin/sh";
    try {
      execSync(`LC_ALL=en_US.UTF-8 ${shell} -L -i -c 'printenv'`, { encoding: "utf8" })
        .split("\n")
        .forEach((l) => {
          const [k, v] = l.split("=");
          if (k && v) {
            process.env[k] = v;
          }
        });
    } catch (e) {
      console.error("Error retrieving user shell envs:", e);
    }
  }

  /*
   * Add user difined paths on process.env.PATH.
   */
  private _initPaths(): void {
    const shell = os.userInfo().shell || "/bin/sh";
    try {
      const path = execSync(`${shell} -l -c 'echo $PATH'`).toString().trim();
      process.env.PATH = path;
    } catch (e) {
      console.error("Error retrieving user shell paths:", e);
    }
  }

  /**
   * Mcp Client Connect to the server.
   */
  private async _connect(): Promise<void> {
    if (!this._connected) {
      await this._client.connect(new StdioClientTransport(this._config));
      this._connected = true;
    }
  }

  /**
   * Get Available Tools from Mcp Server.
   * @param use_cache - disable tools cache.
   */
  async GetTools(use_cache = true): Promise<McpServerTool[]> {
    if (use_cache && this._tools) return this._tools;

    await this._connect();

    try {
      const tools = await this._client.listTools();
      this._tools = tools.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        };
      });
      return this._tools;
    } finally {
      await this._client.close();
    }
  }

  /**
   * Get Available Tools from Mcp Server in Ollama Tools Format.
   * @param use_cache - disable tools cache.
   */
  async GetToolsForOllama(use_cache = true): Promise<OllamaApiTool[]> {
    if (use_cache && this._ollamaTools) return this._ollamaTools;
    const tools = await this.GetTools(use_cache);
    this._ollamaTools = ConvertMcpToolsToOllamaTools(tools);
    return this._ollamaTools;
  }

  /**
   * Call Tools on Mcp Server.
   * @param tools - Ollama Message Tool Calls.
   */
  async CallToolsForOllama(tools: OllamaApiChatMessageToolCall[]): Promise<any[]> {
    await this._connect();

    try {
      return await Promise.all(
        tools.map(async (tool): Promise<any> => {
          const result = await this._client.callTool(tool.function);
          return result.content;
        })
      );
    } finally {
      await this._client.close();
    }
  }
}
