export const APP_URL = 'https://app.whenever.dev';
export const MCP_URL = 'https://mcp.whenever.dev/';
export const AUTHORIZE_URL = `${APP_URL}/_api/whenever-mcp/oauth/authorize`;
export const workflowUrl = (id: string) => `${APP_URL}/workflows/${encodeURIComponent(id)}`;
