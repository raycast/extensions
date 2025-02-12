import { showToast, LocalStorage, Toast } from "@raycast/api";

export default async function main() {
  showToast({
    style: Toast.Style.Animated,
    title: "Loading...",
  });
  await LocalStorage.clear();
  showToast({
    style: Toast.Style.Success,
    title: "Done",
  });
}
