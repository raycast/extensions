import { LocalStorage, showToast, Toast } from "@raycast/api";

export async function notifyError(error: Error) {
  if (error.name === "AbortError") {
    console.warn("Operation aborted:", error);
    return;
  }
  if (error.message.includes("This operation was aborted")) {
    console.warn("Operation aborted:", error);
    return;
  }
  console.error("Error:", error);
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error.message,
  });
}

export async function getRequestsCount() {
  const count = Number(JSON.parse((await LocalStorage.getItem("requestsCount")) || "0"));

  return count;
}

export async function incrementRequestsCount() {
  const count = await getRequestsCount();

  await LocalStorage.setItem("requestsCount", JSON.stringify(count + 1));
}
