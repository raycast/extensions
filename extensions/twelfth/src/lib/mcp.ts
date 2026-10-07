import { createMcpClient } from "../vendor/twelfth-shared/index";
import { session } from "./auth";
import { ENDPOINTS } from "./config";

export const { callTool } = createMcpClient({
  url: ENDPOINTS.mcp,
  session,
  keyRejectedMessage: "Twelfth rejected the workspace API key. Check it in the extension's preferences.",
});
