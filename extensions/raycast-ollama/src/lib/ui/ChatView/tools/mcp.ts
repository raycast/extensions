import { Tool, ToolResult } from "./main";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Implementation } from "@modelcontextprotocol/sdk/types";

const mcpClientImplementation: Implementation = { name: "raycast-extension-ollama", version: "2026-05-18" };

/* Get Available Tools from Mcp Server */
export async function ToolMcp(stdioServerParam: StdioServerParameters): Promise<Tool[]> {
  const tools: Tool[] = [];

  /* Init Mcp Client */
  const client = new Client(mcpClientImplementation);

  /* Init Mcp Client Transport */
  const transport = new StdioClientTransport(stdioServerParam);

  /* Connect to Mcp Server */
  await client.connect(transport);

  /* Get Mcp Server Tools */
  const mcpTools = await client.listTools();

  /* Disconnect from Mcp Server */
  await client.close();

  for (const mcpTool of mcpTools.tools) {
    /* Tool Call Function */
    const fn = async (parameters: Record<string, unknown>): Promise<ToolResult> => {
      try {
        /* Connect to Mcp Server */
        await client.connect(transport);

        /* Tool Call */
        const result = await client.callTool({ name: mcpTool.name, arguments: parameters });

        /* Disconnect from Mcp Server */
        await client.close();

        return {
          tool_name: mcpTool.name,
          content: JSON.stringify(result.content),
        };
      } catch (error) {
        console.error(error);
        return {
          tool_name: mcpTool.name,
          content: `Error: ${error}`,
        };
      }
    };

    /* Push Tool */
    tools.push({
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema,
      fn: fn,
    });
  }

  return tools;
}
