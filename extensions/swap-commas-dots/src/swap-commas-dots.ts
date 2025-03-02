import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

export default async () => {
  try {
    const selectedText = await getSelectedText();
    const transformedText = selectedText.replace(/[.,]/g, (val) => (val === "." ? "," : "."));
    await Clipboard.paste(transformedText);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
};
