import { Cache, closeMainWindow, showToast, Toast } from "@raycast/api";

const cache = new Cache();

export default async function Command() {
  cache.clear();
  closeMainWindow();
  await showToast({
    style: Toast.Style.Success,
    title: "All data cleared",
  });
}
