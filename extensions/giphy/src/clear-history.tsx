import { LocalStorage, showToast, Toast } from "@raycast/api";

export default async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clearing ...",
  });
  try {
    await LocalStorage.removeItem("recents");
    toast.style = Toast.Style.Success;
    toast.title = "Cleared.";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to clear history!";
  }
};
