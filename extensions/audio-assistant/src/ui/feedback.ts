import { showToast, Toast } from "@raycast/api";
export async function reportError(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Audio Assistant",
    message: error instanceof Error ? error.message : "Something went wrong. Try again.",
  });
}
