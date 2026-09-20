import { showToast, Toast } from "@raycast/api";

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function showFailure(title: string, error: unknown) {
  await showToast({ style: Toast.Style.Failure, title, message: errorMessage(error) });
}

export function compact(text: string, length = 52): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > length ? `${oneLine.slice(0, length - 1)}…` : oneLine;
}
