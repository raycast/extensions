import { Toast, showToast } from "@raycast/api";

export async function showCopyToast() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying to clipboard...",
  });

  setTimeout(() => {
    toast.style = Toast.Style.Success;
    toast.title = "Secret copied to clipboard";
  }, 500);
} 
