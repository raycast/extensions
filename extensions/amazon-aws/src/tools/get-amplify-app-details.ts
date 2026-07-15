import { AmplifyClient, GetAppCommand, App } from "@aws-sdk/client-amplify";

/**
 * Gets detailed information for a specific Amplify app
 * @param options - Configuration options
 * @returns Promise<App | undefined> App details or undefined if not found
 */
export default async function getAmplifyAppDetails(options: { appId: string }): Promise<App | undefined> {
  const { appId } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }

  const client = new AmplifyClient({});

  try {
    const command = new GetAppCommand({ appId });
    const response = await client.send(command);
    return response.app;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundException") {
      return undefined;
    }
    throw error;
  }
}
