import { getSelectedText, showToast, Clipboard, Toast } from "@raycast/api";
import { getPreferences } from "./preferences";

export default async function Command() {
  return getSelectedText() //
    .then(convertIssueIdsIntoMarkdownLinks)
    .then(replaceSelectedText)
    .catch(handleErrors);
}

const convertIssueIdsIntoMarkdownLinks = (text: string): string => {
  const { url, format } = getPreferences();
  const regexp = new RegExp(format, "gm");

  return text.replace(regexp, `[$&](${url})`);
};

const replaceSelectedText = (text: string): Promise<void> => {
  return Clipboard.paste({ text: text });
};

const handleErrors = () => {
  return showToast({
    style: Toast.Style.Failure,
    title: "No text selected",
  });
};
