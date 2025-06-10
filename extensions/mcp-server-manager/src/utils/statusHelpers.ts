import { StatusDisplay } from "./statusDisplay";
import { MCPServerWithMetadata } from "../types/mcpServer";

export function buildStatusParts(
  server: MCPServerWithMetadata & {
    isProtected?: boolean;
    isUnlocked?: boolean;
  },
) {
  const { isProtected = false, isUnlocked = false } = server;
  const isLocked = isProtected && !isUnlocked;
  const statusParts = [];

  if (server.editor === "cursor") {
    statusParts.push(StatusDisplay.cursorManaged);
  } else if (server.config.disabled === true) {
    statusParts.push(StatusDisplay.disabled);
  } else {
    statusParts.push(StatusDisplay.enabled);
  }

  if (isProtected && isLocked) {
    statusParts.push(StatusDisplay.protected);
  }

  return statusParts;
}
