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
  if (!workflow || !Array.isArray(workflow.nodes)) {
    return null;
  }

  const webhookNode = workflow.nodes.find(
    (node: Node) => node.type === "n8n-nodes-base.webhook"
  );

  if (webhookNode) {
    const params = webhookNode.parameters as WebhookNodeParams;
    const method = params.httpMethod?.toUpperCase(); // Normalize method
    const path = params.path;

    if (method && path) {
      return {
        method: method,
        path: path,
        nodeId: webhookNode.id || "unknown", // Use node ID if available
      };
    }
  }

  return null;
}