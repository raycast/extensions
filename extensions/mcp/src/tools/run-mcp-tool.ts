import getProcessedClients from "../getProcessedClients";

type Input = {
  /**
   * Which client to access
   */
  clientName: string;
  /**
   * Which tool to call in the chosen client
   */
  toolName: string;
  /**
   * This must be a STRING (not an object), that when given to JSON.parse(), is a valid input to the tool that you have chosen.
   */
  toolParameters: string;
};

/**
 * YOU MUST call this tool with the following schema: {clientName: string; toolName: string; toolParameters: string;}
 *
 * ENSURE `toolName` and `clientName` are what you retrieved from get-mcp-clients. Before you ever call run-mcp-tools, you should ALWAYS first run get-mcp-clients since you do not know what clients and thus tools are available to you and what their parameters are. If the user requests an action that doesn't seem to match any tools, kindly decline it. Finally, the toolParameters should be a STRING that can be parsed into a valid input for the tool you want to run with JSON.parse().
 */
export default async function (input: Input) {
  const clients = await getProcessedClients(input.clientName);

  const client = clients.find((x) => x.name == input.clientName);
  if (!client) {
    throw new Error(`Client with name ${input.clientName} not found`);
  }

  return await client.clientInstance.callTool({
    name: input.toolName,
    arguments: JSON.parse(input.toolParameters),
  });
}
