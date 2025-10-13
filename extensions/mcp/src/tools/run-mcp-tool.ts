import getProcessedClients, { CreatedClient } from "../getProcessedClients";

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

  /**
   * The timeout for the tool call in milliseconds.
   * Default timeout is 60000 milliseconds (1 minute).
   *
   * Some tools calls might take longer, so you can increase the timeout,
   * especially if previous tool call failed due to timeout.
   */
  timeout?: number;
};

/**
 * YOU MUST call this tool with the following schema: {clientName: string; toolName: string; toolParameters: string;}
 *
 * ENSURE `toolName` and `clientName` are what you retrieved from get-mcp-clients. Before you ever call run-mcp-tools, you should ALWAYS first run get-mcp-clients since you do not know what clients and thus tools are available to you and what their parameters are. If the user requests an action that doesn't seem to match any tools, kindly decline it. Finally, the toolParameters should be a STRING that can be parsed into a valid input for the tool you want to run with JSON.parse().
 */
export default async function (input: Input) {
  const result = await getProcessedClients(input.clientName);

  const client = result.clients.find((client: CreatedClient) => client.name === input.clientName);

  if (!client) {
    const failedClient = result.errors.find((error) => error.name === input.clientName);

    if (failedClient) {
      throw new Error(`Client with name ${input.clientName} failed to connect: ${failedClient.error}`);
    } else {
      throw new Error(`Client with name ${input.clientName} not found`);
    }
  }

  const toolArgs = input.toolParameters.length > 0 ? JSON.parse(input.toolParameters) : {};

  return await client.clientInstance.callTool(
    {
      name: input.toolName,
      arguments: toolArgs,
    },
    undefined,
    { timeout: input.timeout ?? 60000 },
  );
}
