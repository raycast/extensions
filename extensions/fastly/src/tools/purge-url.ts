import { Action, Tool } from "@raycast/api";
import { purgeUrl } from "../api";

type Input = {
  /** The full URL to purge from the cache, e.g. "https://www.example.com/path/to/page" */
  url: string;
  /**
   * Soft purge marks the content as stale instead of removing it, so Fastly can
   * keep serving it while revalidating. Defaults to true; only pass false when
   * the user asks for a hard purge or the content must disappear immediately.
   */
  soft?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async ({ url, soft }) => {
  const isSoft = soft !== false;
  return {
    style: isSoft ? undefined : Action.Style.Destructive,
    message: "Purge this URL from the Fastly cache?",
    info: [
      { name: "URL", value: url },
      { name: "Purge type", value: isSoft ? "Soft (mark stale)" : "Hard (remove immediately)" },
    ],
  };
};

/**
 * Purge a single URL from the Fastly cache. Works across services; the URL
 * itself identifies what to purge.
 */
export default async function ({ url, soft = true }: Input) {
  const result = await purgeUrl(url, soft);
  return { purged: url, soft, status: result.status || "ok", purge_id: result.id };
}
