import getProcessedClients from "../getProcessedClients";

/**
 * This tool will help you get information about available MCP clients, such as the tools.
 * You always should use this to understand which tools you can call
 * and its signature before using run-mcp-tool.
 */
export default async function () {
  const result = await getProcessedClients();

  const response = {
    clients: result.clients.map(({ name, tools }) => ({ name, tool: tools })),
    errors: result.errors.map(({ name, error, type }) => ({ name, error, type })),
  };

  return response;
}
