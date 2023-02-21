import { Clipboard, popToRoot, closeMainWindow, showToast, Toast, showHUD } from '@raycast/api';

export default async () => {
  try {
    const clipboardText = (await Clipboard.readText()) as string;
    const trimmedText = clipboardText.trim();
    let jsObject = parseJson(trimmedText);
    if (!jsObject) {
      jsObject = parseJSObject(trimmedText);
    }
    await Clipboard.paste(JSON.stringify(jsObject, null, 2));
    showHUD('Pasted succesfully!');
    closeMainWindow();
    popToRoot();
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Please copy a valid JSON/JS Object',
    });
    popToRoot();
  }

  function parseJson(input: string) {
    try {
      return JSON.parse(input);
    } catch (err) {
      return;
    }
  }

  function parseJSObject(input: string): object | undefined | Error {
    let output;
    eval(`output = ${input}`);
    return output;
  }
};
