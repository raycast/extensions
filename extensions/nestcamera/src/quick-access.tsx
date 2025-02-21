import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  // TODO: Implement quick access camera opening
  await showToast({
    style: Toast.Style.Animated,
    title: "Opening Camera",
    message: "Quick access camera will be implemented soon"
  });
} 