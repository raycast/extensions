import { AmplifyClient, CreateWebhookCommand, Webhook } from "@aws-sdk/client-amplify";

/**
 * Creates a new webhook for an Amplify app
 * @param options - Configuration options
 * @returns Promise<Webhook | undefined> Created webhook details
 */
export default async function createAmplifyWebhook(options: {
  appId: string;
  branchName: string;
  description?: string;
}): Promise<Webhook | undefined> {
  const { appId, branchName, description } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }
  if (!branchName) {
    throw new Error("Branch name is required");
  }

  const client = new AmplifyClient({});

  const command = new CreateWebhookCommand({
    appId,
    branchName,
    ...(description && { description }),
  });

  const response = await client.send(command);
  return response.webhook;
}
