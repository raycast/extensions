import { Clipboard, LaunchProps, showToast, Toast } from "@raycast/api";
import title from "title";

interface TitleArguments {
  text?: string;
}

export default async function main(props: LaunchProps<Record<"arguments", TitleArguments>>) {
  const text = await getText(props.arguments?.text);

  if (!text) {
    await showToast({
      title: "Input & Clipboard Text Is Empty",
      style: Toast.Style.Failure,
    });
    return;
  }

  const result = title(text);
  await Clipboard.copy(result);
  await showToast({
    title: result,
    message: "Copied to Clipboard",
    style: Toast.Style.Success,
  });
}

const getText = async (argument: string | undefined): Promise<string | undefined> => {
  if (argument?.trim()) {
    return argument.trim();
  }
  return Clipboard.readText();
};
