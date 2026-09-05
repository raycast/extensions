export interface Tool {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  fn(parametes: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  tool_name: string;
  content: string;
  tool_call_id?: string;
}
