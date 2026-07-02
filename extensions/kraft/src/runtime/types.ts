export type BuiltInToolMode = "translate" | "polishing" | "summarize" | "what";
export type CustomToolMode = `custom:${string}`;
export type ToolMode = BuiltInToolMode | CustomToolMode;

export interface ToolResult {
  original: string;
  text: string;
  from: string;
  to: string;
  error?: string;
}
