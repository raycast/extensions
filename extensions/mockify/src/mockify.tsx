import { Clipboard, Toast, closeMainWindow, getSelectedText, showToast } from "@raycast/api";

const mockify = (text: string) => {
  let mockedText = "";
  let isUppercase = true;

  for (const char of text) {
    if (!char.match(/[a-z]/i)) {
      mockedText += char;

      continue;
    }

    mockedText += isUppercase ? char.toUpperCase() : char.toLowerCase();
    isUppercase = !isUppercase;
  }

  return mockedText;
};

const getTextFromSelectionOrClipboard = async () => {
  try {
    const selectedText = await getSelectedText();

    return {
      text: selectedText,
      fromClipboard: false,
    };
  } catch (error) {
    const clipboardText = await Clipboard.read();

    return {
      text: clipboardText.text,
      fromClipboard: true,
    };
  }
};

export default async () => {
  const { text, fromClipboard } = await getTextFromSelectionOrClipboard();

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to mockify text.",
      message: "Please select some text or copy it to clipboard.",
    });

    return;
  }

  const mockifiedText = mockify(text);

  if (fromClipboard) {
    await Clipboard.copy(mockifiedText);

    await showToast({
      style: Toast.Style.Success,
      title: "Text copied to clipboard.",
      message: "You can now paste it anywhere.",
    });

    return;
  }

  await Clipboard.paste(mockifiedText);

  await closeMainWindow();
};
