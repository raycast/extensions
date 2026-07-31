import { showToast, Toast } from "@raycast/api";

export type NormalizedError = { title: string; message: string };

type ClerkApiErrorShape = {
  clerkError: true;
  status: number;
  errors?: Array<{ message?: string }>;
};

function isClerkApiError(error: unknown): error is ClerkApiErrorShape {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<string, unknown>).clerkError === true &&
    typeof (error as Record<string, unknown>).status === "number"
  );
}

export function normalizeClerkError(error: unknown): NormalizedError {
  if (isClerkApiError(error)) {
    const first = error.errors?.[0]?.message ?? "Request failed.";
    if (error.status === 401 || error.status === 403) {
      return {
        title: "Secret key was rejected",
        message: "Check this app in Manage Apps. " + first,
      };
    }
    if (error.status === 429) {
      return { title: "Rate limit reached", message: "Please wait and try again." };
    }
    return { title: "Clerk error", message: first };
  }
  if (error instanceof Error) {
    return { title: "Something went wrong", message: error.message };
  }
  return { title: "Something went wrong", message: String(error) };
}

export async function showClerkError(error: unknown): Promise<void> {
  const { title, message } = normalizeClerkError(error);
  await showToast({ style: Toast.Style.Failure, title, message });
}
