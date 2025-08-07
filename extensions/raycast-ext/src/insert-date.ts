import { Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    await Clipboard.paste(dateString);

    await showToast({
      style: Toast.Style.Success,
      title: "Date Inserted",
      message: dateString,
    });
  } catch (error) {
    console.error("Failed to insert date:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Insert Date",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
