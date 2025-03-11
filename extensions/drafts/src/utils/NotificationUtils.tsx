import { closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";

/**
 * Closes the main window and shows a success toast with the given text.
 * @param text the text to display in the toast
 */
export async function closeMainWindowAndShowSuccessToast(text: string) {
  await closeMainWindow();
  popToRoot({ clearSearchBar: true });
  await showToast({
    style: Toast.Style.Success,
    title: text,
  });
}
