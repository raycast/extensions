import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";

export const update = async (props: { contents: string } | { error: unknown }) => {
  if ("contents" in props) {
    await Clipboard.copy(props.contents);
    await closeMainWindow();
    await showToast(Toast.Style.Success, "Copied to clipboard");
  } else {
    await closeMainWindow();
    await showToast(Toast.Style.Failure, props.error instanceof Error ? props.error.message : String(props.error));
  }
};
