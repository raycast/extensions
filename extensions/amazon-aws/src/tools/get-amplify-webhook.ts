import { AmplifyClient, GetWebhookCommand, Webhook } from "@aws-sdk/client-amplify";

/**
 * Gets detailed information for a specific Amplify webhook
 * @param options - Configuration options
 * @returns Promise<Webhook | undefined> Webhook details or undefined if not found
 */
export default async function getAmplifyWebhook(options: { webhookId: string }): Promise<Webhook | undefined> {
  const { webhookId } = options;

  if (!webhookId) {
    throw new Error("Webhook ID is required");
  }

  const client = new AmplifyClient({});

  try {
    const command = new GetWebhookCommand({ webhookId });
    const response = await client.send(command);
    return response.webhook;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundException") {
      return undefined;
    }
    throw error;
  }
}
