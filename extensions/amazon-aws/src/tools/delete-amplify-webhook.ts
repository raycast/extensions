import { DeleteWebhookCommand } from "@aws-sdk/client-amplify";
import { getAmplifyClient } from "../services/clients/amplify";

/**
 * Deletes a webhook for an Amplify app
 * @param options - Configuration options
 * @returns Promise<void>
 */
export default async function deleteAmplifyWebhook(options: { webhookId: string }): Promise<void> {
  const { webhookId } = options;

  if (!webhookId) {
    throw new Error("Webhook ID is required");
  }

  const client = getAmplifyClient();

  const command = new DeleteWebhookCommand({
    webhookId,
  });

  await client.send(command);
}
