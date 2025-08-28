import { AmplifyClient, ListWebhooksCommand, Webhook } from "@aws-sdk/client-amplify";

/**
 * Lists all webhooks for a specific Amplify app
 * @param options - Configuration options
 * @returns Promise<Webhook[]> Array of webhooks for the app
 */
export default async function listAmplifyWebhooks(options: { appId: string }): Promise<Webhook[]> {
  const { appId } = options;

  if (!appId) {
    throw new Error("App ID is required");
  }

  const client = new AmplifyClient({});

  const webhooks: Webhook[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListWebhooksCommand({ appId, nextToken });
    const response = await client.send(command);

    if (response.webhooks) {
      webhooks.push(...response.webhooks);
    }

    nextToken = response.nextToken;
  } while (nextToken);

  return webhooks;
}
