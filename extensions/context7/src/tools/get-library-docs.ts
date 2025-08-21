import getProcessedClients from "../ProcessConfig";

type Input = {
  context7CompatibleLibraryID: string;
  tokens?: number;
  topic?: string;
};

/**
 * Fetches documentation for a Context7-compatible library ID.
 */
export default async function (input: Input) {
  const clients = await getProcessedClients("context7");
  const context7Client = clients.find((x) => x.name === "context7");

  if (!context7Client) {
    throw new Error("Context7 client not found");
  }

  // Assuming the context7 client instance has a method to call its internal tools
  // and the tool name for getting library docs is 'get-library-docs'
  const result = await context7Client.clientInstance.callTool({
    name: "get-library-docs",
    arguments: input, // Pass the input directly as arguments
  });

  return result;
}
