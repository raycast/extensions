import { open, showToast, Toast } from "@raycast/api";

export default async function OpenLibrary() {
  try {
    await open("pond://library");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Pond",
      message: error instanceof Error ? error.message : "Install Pond and open it once, then try again.",
    });
  }
}
