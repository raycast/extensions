import getProcessedClients from "../ProcessConfig";

type Input = {
  libraryName: string;
};

/**
 * Resolves a library name to a Context7-compatible ID for fetching documentation.
 */
export default async function (input: Input) {
  const clients = await getProcessedClients("context7");
  const context7Client = clients.find((x) => x.name === "context7");

  if (!context7Client) {
    throw new Error("Context7 client not found");
  }

  // Assuming the context7 client instance has a method to call its internal tools
  // and the tool name for resolving library ID is 'resolve-library-id'
  const result = await context7Client.clientInstance.callTool({
    name: "resolve-library-id",
    arguments: { libraryName: input.libraryName },
  });

  return result;
}
