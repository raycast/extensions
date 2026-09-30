import { OllamaApiTool } from "../../../ollama/types";

export interface Tool {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  fn(parametes: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  tool_name: string;
  content: string;
}

/* Convert Tool Array to OllamaApiTool Array */
export function GetOllamaApiTools(tools: Tool[]): OllamaApiTool[] {
  return tools.map(
    (tools) =>
      <OllamaApiTool>{
        type: "function",
        function: {
          name: tools.name,
          description: tools.description,
          ...tools.parameters,
        },
      },
  );
}
