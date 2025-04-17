import { Workflow, Node } from "../types/types"; // Assuming Node type is defined in types.ts

// Define a more specific type for webhook node parameters if possible
// Based on the example provided:
interface WebhookNodeParams {
  httpMethod?: string;
  path?: string;
  options?: Record<string, unknown>;
  // Add other potential webhook parameters if known
}

interface WebhookDetails {
  method: string;
  path: string;
  nodeId: string; // Include node ID for reference if needed
}

/**
 * Checks if a workflow contains a webhook trigger node and returns its details.
 * Currently assumes the first node of type 'n8n-nodes-base.webhook' is the trigger.
 * @param workflow The workflow object to check.
 * @returns WebhookDetails object if found, otherwise null.
 */
export function getWebhookDetails(workflow: Workflow): WebhookDetails | null {
  console.log(
    `Checking webhook details for workflow: ${workflow?.name || "undefined"} (ID: ${workflow?.id || "undefined"})`
  );

  if (!workflow || !Array.isArray(workflow.nodes)) {
    console.log(`Workflow or nodes array is missing for workflow: ${workflow?.id || "undefined"}`);
    return null;
  }

  console.log(`Workflow has ${workflow.nodes.length} nodes`);

  const webhookNode = workflow.nodes.find((node: Node) => node.type === "n8n-nodes-base.webhook");

  console.log(`Webhook node found: ${webhookNode ? "yes" : "no"}`);

  if (webhookNode) {
    const params = webhookNode.parameters as WebhookNodeParams;
    console.log(`Webhook node parameters: ${JSON.stringify(params)}`);

    // Normalize method, handling empty string case
    const method = params.httpMethod?.trim() ? params.httpMethod.trim().toUpperCase() : undefined;
    const path = params.path;

    console.log(`Method: ${method || "undefined"}, Path: ${path || "undefined"}`);

    if (method && path) {
      return {
        method: method,
        path: path,
        nodeId: webhookNode.id || "unknown", // Use node ID if available
      };
    } else {
      console.log(`Missing method or path in webhook node parameters`);
    }
  }

  return null;
}
