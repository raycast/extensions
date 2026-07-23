import { buildRequest, parseResponse, Provider } from "./providers";

const REQUEST_TIMEOUT_MS = 30_000;

export class PolishError extends Error {
  constructor(
    message: string,
    public readonly isAuthError: boolean = false,
  ) {
    super(message);
  }
}

export async function polishText(
  text: string,
  provider: Provider,
  apiKey: string,
): Promise<string> {
  const { url, init } = buildRequest(provider, apiKey, text);

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: timeoutController.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new PolishError(
        "The request to the AI provider timed out. Try again.",
      );
    }
    throw new PolishError(
      "Could not reach the AI provider. Check your network connection and try again.",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new PolishError(
        "The API key was rejected. Check your API key in extension preferences.",
        true,
      );
    }
    if (response.status === 429) {
      throw new PolishError(
        "The AI provider rate-limited this request. Try again in a moment.",
      );
    }
    throw new PolishError(
      `The AI provider returned an error (HTTP ${response.status}).`,
    );
  }

  try {
    const json = await response.json();
    return parseResponse(provider, json);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "The AI provider returned a response that could not be understood.";
    throw new PolishError(message);
  }
}
