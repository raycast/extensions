export const ENVIRONMENT = "production" as "staging" | "production";
export const API_ORIGIN = "https://api.synci.io";
export const API_URL = `${API_ORIGIN}/api/v1`;
export const MCP_URL = `${API_ORIGIN}/mcp`;
export const APP_URL = "https://app.synci.io";
export const OAUTH_URL = `${API_ORIGIN}/oauth`;
// Public identifier shared by all installations. Never add a client secret here.
export const OAUTH_CLIENT_ID: string = "01a0d7ef-8ad8-7392-9ae1-7947d752dac0";
export const OAUTH_SCOPES = "accounts:read transactions:read financial-connections:read mcp:use";
// Darker emerald in light mode keeps inflows legible on Raycast's pale backgrounds.
export const SYNCI_GREEN = { light: "#059669", dark: "#34D399" };
