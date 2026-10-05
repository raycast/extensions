import { fetchWithTimeout } from "./HttpClient";
import { baseURI, refreshToken } from "./WebClient";

export interface TaskApiResponse {
  response: Response;
  token: string;
}

export const readTaskApiError = async (response: Response) => {
  const body = await response.text();
  let detail = body;

  try {
    const parsed = JSON.parse(body) as { description?: string; message?: string; title?: string };
    detail = parsed.description ?? parsed.message ?? parsed.title ?? body;
  } catch {
    // Keep the plain response body when it isn't JSON.
  }

  return new Error(detail || `HTTP error! status: ${response.status}`);
};

export const taskApiRequest = async (
  path: string,
  token: string,
  options: RequestInit = {},
  hasRefreshed = false,
): Promise<TaskApiResponse> => {
  const response = await fetchWithTimeout(`${baseURI}/${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
    redirect: "follow",
  });

  if (response.status === 401 && !hasRefreshed) {
    const newTokens = await refreshToken();
    if (newTokens) {
      return taskApiRequest(path, newTokens.accessToken, options, true);
    }
  }

  return { response, token };
};

export const requireSuccessfulTaskApiResponse = async (result: TaskApiResponse): Promise<TaskApiResponse> => {
  if (!result.response.ok) throw await readTaskApiError(result.response);
  return result;
};
