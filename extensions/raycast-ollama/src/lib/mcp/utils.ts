import { OllamaApiTool } from "../ollama/types";
import { McpServerTool } from "./types";

/**
 * Convert Mcp Server Tools format into Ollama Tools.
 * @param tools - Mcp Server Tools.
 */
export function ConvertMcpToolsToOllamaTools(tools: McpServerTool[]): OllamaApiTool[] {
  return tools.map((tool): OllamaApiTool => {
    const tO = <OllamaApiTool>{
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: {
          type: "object",
          required: tool.inputSchema.required || [],
          properties: {},
        },
      },
    };
    Object.keys(tool.inputSchema.properties).forEach((k: string) => {
      const value = tool.inputSchema.properties[k];
      tO.function.parameters.properties[k] = {
        type: value.type,
        description: value.description || "",
      };
      if (value.items?.enum) tO.function.parameters.properties[k].enum = value.items.enum;
    });
    return tO;
  });
}
