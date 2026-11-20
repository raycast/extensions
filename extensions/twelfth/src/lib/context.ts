import { LocalStorage } from "@raycast/api";
import { workspaceContextReader } from "../vendor/twelfth-shared/index";
import { session } from "./auth";
import { callTool } from "./mcp";

export type { WorkspaceContext } from "../vendor/twelfth-shared/index";

/** Cached in LocalStorage: the menu bar refreshes every 15 minutes and needn't re-read settings each time. */
export const workspaceContext = workspaceContextReader({ storage: LocalStorage, session, callTool });
