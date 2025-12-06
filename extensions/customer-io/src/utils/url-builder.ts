/**
 * Helper to generate Customer.io URLs.
 */
export function getCustomerIoUrl(
  workspaceId: string,
  type: "campaign" | "broadcast" | "segment",
  id: number | string,
): string {
  const baseUrl = `https://fly.customer.io/workspaces/${workspaceId}`;

  switch (type) {
    case "campaign":
      return `${baseUrl}/journeys/campaigns/${id}/overview`;
    case "broadcast":
      return `${baseUrl}/journeys/broadcasts/${id}`;
    case "segment":
      return `${baseUrl}/segments/${id}`;
    default:
      return baseUrl;
  }
}
