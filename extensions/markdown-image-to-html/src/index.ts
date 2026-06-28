import { Clipboard, LaunchProps, showToast, Toast, getSelectedText, getPreferenceValues } from "@raycast/api";

export default async function main(
  props: LaunchProps<{
    arguments: {
      mardownImage: string | undefined;
      imageWidth: number | undefined;
    };
  }>
) {
  const preferences = getPreferenceValues<{
    imageWidth?: number;
  }>();

  const imageWidth: number =
    props.arguments.imageWidth && !isNaN(props.arguments.imageWidth)
      ? props.arguments.imageWidth
      : preferences.imageWidth ?? 300;

  const regex = /!\[(.*?)]\((\S+)\)/g;
  const markdown = await getBestMatch(regex, props.arguments.mardownImage);
  if (markdown === undefined) {
    await showToast({
      title: "Error",
      message: "No valid markdown image found as parameter, selected or in your clipboard.",
      style: Toast.Style.Failure,
    });
    return;
  }
  const result = markdown.replace(regex, `<img width="${imageWidth}" alt="$1" src="$2"/>`);

  await Clipboard.paste(result);
}

async function getBestMatch(regex: RegExp, param: string | undefined): Promise<string | undefined> {
  if (param && regex.test(param)) {
    return param;
  }
  try {
    const selectedText = await getSelectedText();
    if (regex.test(selectedText)) {
      return selectedText;
    }
  } catch {
    console.log("no selected text");
  }
  const clipboardText = (await Clipboard.readText()) ?? "";
  if (regex.test(clipboardText)) {
    return clipboardText;
  }
  return undefined;
}
