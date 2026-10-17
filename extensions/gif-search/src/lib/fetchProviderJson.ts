type FetchProviderJsonOptions = {
  provider: string;
  request: string;
  init?: RequestInit;
};

const REQUEST_TIMEOUT_MS = 15_000;

export class ProviderRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && error.name === "TimeoutError";
}

export async function fetchProviderJson<T>(
  url: URL,
  { provider, request, init }: FetchProviderJsonOptions,
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  try {
    const response = await fetch(url.toString(), { ...init, signal });

    if (!response.ok) {
      throw new ProviderRequestError(
        `${provider} ${request} failed (${response.status} ${response.statusText || "Unknown Error"}).`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      throw error;
    }

    if (isTimeoutError(error)) {
      throw new ProviderRequestError(`Request to ${provider} timed out. The server may be slow - please try again.`);
    }

    throw new ProviderRequestError(
      `Could not reach ${provider}. Check your internet connection, VPN, proxy, or firewall, then try again. ${getErrorMessage(error)}`,
    );
  }
}
