/**
 * Helper to generate Customer.io URLs.
 */
export function getCustomerIoUrl(
  workspaceId: string,
  type: "campaign" | "broadcast" | "segment",
  id: number | string,
  options?: { broadcastType?: string; state?: string },
): string {
  const baseUrl = `https://fly.customer.io/workspaces/${workspaceId}`;

  switch (type) {
    case "campaign":
      return `${baseUrl}/journeys/campaigns/${id}/overview`;
    case "broadcast": {
      // Always use 'newsletter' in URL path since we only show newsletters
      const broadcastType = "newsletter";
      const state = options?.state?.toLowerCase();

      // Determine suffix based on state
      let suffix = "/overview/reports"; // Default for sent/cancelled
      if (state === "draft") {
        suffix = "/setup/recipients";
      } else if (state === "scheduled") {
        suffix = "/setup/review";
      }

      return `${baseUrl}/journeys/broadcasts/${broadcastType}/${id}${suffix}`;
    }
    case "segment":
      return `${baseUrl}/segments/${id}`;
    default:
      return baseUrl;
  }
}
