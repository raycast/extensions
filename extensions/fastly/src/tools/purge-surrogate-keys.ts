import { Action, Tool } from "@raycast/api";
import { getServiceDetails, purgeSurrogateKeys } from "../api";

type Input = {
  /** The service ID. Resolve a service name to its ID with the get-services tool first. */
  serviceId: string;
  /**
   * The surrogate keys (cache tags) to purge, separated by commas or spaces,
   * e.g. "product-123, homepage". Up to 256 keys per request.
   */
  keys: string;
  /**
   * Soft purge marks the content as stale instead of removing it, so Fastly can
   * keep serving it while revalidating. Defaults to true; only pass false when
   * the user asks for a hard purge or the content must disappear immediately.
   */
  soft?: boolean;
};

function splitKeys(keys: string): string[] {
  return keys
    .split(/[\s,]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

export const confirmation: Tool.Confirmation<Input> = async ({ serviceId, keys, soft }) => {
  const details = await getServiceDetails(serviceId);
  const isSoft = soft !== false;
  return {
    style: isSoft ? undefined : Action.Style.Destructive,
    message: "Purge these surrogate keys from the Fastly cache?",
    info: [
      { name: "Service", value: details.name },
      { name: "Keys", value: splitKeys(keys).join(", ") },
      { name: "Purge type", value: isSoft ? "Soft (mark stale)" : "Hard (remove immediately)" },
    ],
  };
};

/**
 * Purge cached content by surrogate key (cache tag) on a Fastly service.
 * This is the preferred way to purge groups of related content.
 */
export default async function ({ serviceId, keys, soft = true }: Input) {
  const keyList = splitKeys(keys);
  if (keyList.length === 0) {
    throw new Error("No surrogate keys provided");
  }
  const result = await purgeSurrogateKeys(serviceId, keyList, soft);
  return { purged_keys: keyList, soft, result };
}
