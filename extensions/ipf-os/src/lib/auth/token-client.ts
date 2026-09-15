import { getApiBaseUrl } from "../config";
import { ApiError, toApiError } from "../api/errors";
import { unwrap } from "../api/envelope";
import type { AuthSession } from "./provider";

const GATEWAY_EXAMPLE = "https://os.gateway.beagile.africa/api/v1";

export async function postForTokens(path: string, body: unknown): Promise<AuthSession> {
  const url = `${getApiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new Error(
      `Could not reach the iPF OS gateway at ${url}. Check that the backend is running and that the API Base URL preference is correct.`,
      { cause },
    );
  }

  const text = await response.text();
  const parsed: unknown = text.length > 0 ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    if (response.status === 404) {
      const hasPrefix = getApiBaseUrl().endsWith("/api/v1");
      const hint = hasPrefix
        ? `That host does not serve the iPF OS gateway. Use ${GATEWAY_EXAMPLE}, or http://localhost:8080/api/v1 against a local stack.`
        : `The API Base URL must include the /api/v1 prefix, for example ${GATEWAY_EXAMPLE}`;
      throw new ApiError(404, "NOT_FOUND", `No auth endpoint at ${url}. ${hint}`);
    }
    throw toApiError(response.status, parsed, "Sign-in failed.");
  }

  return unwrap<AuthSession>(parsed);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
