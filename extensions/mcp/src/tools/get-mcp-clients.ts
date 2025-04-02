import getProcessedClients from "../getProcessedClients";

/**
 * This tool will help you get information about available MCP clients, such as the tools. You always should use this to understand which tools you can call and its signature before using run-mcp-tool.
 */
export default async function () {
  return await getProcessedClients().then((clients) => {
    return clients.map((client) => ({
      name: client.name,
      tool: client.tools,
    }));
  });
}
