import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    // Throw an error
    throw new Error("This is a test error");
  } catch (error) {
    await showFailureToast(error, { title: "Test Error" });
  }
}

// Our own implementation of showFailureToast
async function showFailureToast(error: unknown, options?: { title?: string }) {
  const toast = await showToast({
    style: Toast.Style.Failure,
    title: options?.title || "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
  });
  
  return toast;
}
