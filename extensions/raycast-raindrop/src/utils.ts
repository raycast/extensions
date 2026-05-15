import { showToast, Toast } from "@raycast/api";

/**
 * Validate API token by making a simple API call.
 */
export async function validateToken(): Promise<boolean> {
  try {
    // Dynamically import to avoid circular deps
    const { getCollections } = await import("./api");
    const res = await getCollections();
    return res.result;
  } catch {
    return false;
  }
}

/**
 * Show a toast for API errors
 */
export function showErrorToast(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  showToast({
    style: Toast.Style.Failure,
    title: "Raindrop API Error",
    message,
  });
}
