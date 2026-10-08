/**
 * Makes a POST request to the Origami API using fetch
 * @param url The API endpoint URL
 * @param data The request payload
 * @returns A promise that resolves with the parsed JSON response
 */
export async function makeRequest<T>(url: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
