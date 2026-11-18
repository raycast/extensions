import { session } from "./auth";
import { SynciMcpClient } from "./mcp-client";

// AI tools and native commands use the same first-party client and token store.
// Raycast presents the existing PKCE sign-in flow if the user is not signed in.
export const mcp = new SynciMcpClient(() => session.accessToken(true));
