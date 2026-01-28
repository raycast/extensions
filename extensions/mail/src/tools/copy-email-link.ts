import { getMailDeeplinks } from "../copy-foreground-mail-deeplink";

/**
 * Tool for getting email deeplinks from the active Mail application
 * @returns Promise with email deeplinks or error message
 */
export default async function () {
  const result = await getMailDeeplinks();

  if (result.success && result.links.length > 0) {
    return {
      result: result.links,
      metadata: { success: true, count: result.links.length },
    };
  } else {
    return {
      error: result.message || "Failed to get email link, you may not have any emails selected in the Mail app.",
      metadata: { success: false },
    };
  }
}
