const SUPABASE_API_URL = "https://api.supabase.com/v1";

export class SupabaseAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "SupabaseAPIError";
  }
}

export async function supabaseFetch<T>(endpoint: string, accessToken: string): Promise<T> {
  const response = await globalThis.fetch(`${SUPABASE_API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new SupabaseAPIError(401, "Invalid access token. Please check your settings.");
    }
    if (response.status === 403) {
      throw new SupabaseAPIError(403, "Access denied. Token may lack required permissions.");
    }
    throw new SupabaseAPIError(response.status, `API error: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
