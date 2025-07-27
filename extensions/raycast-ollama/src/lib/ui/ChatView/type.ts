import { McpToolInfo } from "../../mcp/types";

/* Data to add on the Context */
export interface PromptContext {
  /* Tools Calling data */
  tools?: {
    data: string;
    meta: McpToolInfo[];
  };
  /* Documents data */
  documents?: string;
}
