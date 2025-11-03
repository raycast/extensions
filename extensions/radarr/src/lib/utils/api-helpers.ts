import { showFailureToast } from "@raycast/utils";

export async function handleAPIError(error: unknown, context: string): Promise<void> {
  console.error(`${context} error:`, error);

  let errorMessage = "Unknown error occurred";

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  await showFailureToast({
    title: context,
    message: errorMessage,
  });
}

export function buildAPIUrl(baseUrl: string, endpoint: string, params?: Record<string, string | number>): string {
  const url = new URL(`${baseUrl}/api/v3/${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}
