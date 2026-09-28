import { Action, Tool } from "@raycast/api";
import { getServiceDetails, purgeCache } from "../api";

type Input = {
  /** The service ID. Resolve a service name to its ID with the get-services tool first. */
  serviceId: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ serviceId }) => {
  const details = await getServiceDetails(serviceId);
  return {
    style: Action.Style.Destructive,
    message:
      "Purge ALL cached content for this service? This immediately invalidates everything in the cache and will send all traffic to your origins until the cache refills. Purge-all cannot be done as a soft purge.",
    info: [
      { name: "Service", value: details.name },
      { name: "Service ID", value: serviceId },
    ],
  };
};

/**
 * Purge the entire cache for a Fastly service. This is a high-impact action:
 * all requests go to origin until the cache refills. Only use it when the user
 * explicitly asks to purge everything; prefer purge-url or purge-surrogate-keys
 * for targeted purges.
 */
export default async function ({ serviceId }: Input) {
  await purgeCache(serviceId);
  return { purged: "all", serviceId };
}
