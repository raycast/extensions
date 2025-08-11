import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    const delinkifiedText = delinkify(selectedText);
    await Clipboard.paste(delinkifiedText);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot delinkify text",
      message: String(error),
    });
  }
}

function delinkify(text: string) {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;

  return text.replace(urlRegex, (url) => {
    const firstPeriodIndex = url.indexOf(".");
    if (firstPeriodIndex !== -1) {
      return url.slice(0, firstPeriodIndex + 1) + "\u200B" + url.slice(firstPeriodIndex + 1);
    }
    return url;
  });
}
