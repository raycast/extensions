import { commonHeaders } from "./constants";
import { getJWTToken } from "./login";
import { fetchWithCookies } from "./utils";

export async function authedFetch(url: string, options: RequestInit = {}) {
  const token = await getJWTToken();

  const headers = { Authorization: `Bearer ${token}`, ...commonHeaders, ...(options.headers || {}) };

  const response = await fetchWithCookies(`https://api-lms.aztu.edu.az/api/${url}`, {
    ...options,
    headers,
  });

  return response;
}
