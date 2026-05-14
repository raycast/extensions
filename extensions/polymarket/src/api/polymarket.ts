/**
 * Helper function to execute a fetch request and handle Polymarket API errors.
 * Specifically checks for HTTP 429 (Rate Limits) to provide a friendly error message.
 *
 * @param url The fully constructed URL to fetch
 * @returns A parsed JSON promise of type T
 */
export async function fetchWithHandling<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Polymarket API rate limit reached. Please wait and try again.");
    }
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  return (await response.json()) as T;
}
