import { showToast, Clipboard, Toast } from "@raycast/api";
import { getPreferences } from "./preferences";
import { getSelectedTextOfFrontmostApplication, MarkdownText, SelectedText } from "./selected_text";

export default async function Command() {
  return getSelectedTextOfFrontmostApplication()
    .then(convertIssueIdsIntoMarkdownLinks)
    .then(replaceSelectedText)
    .catch(handleErrors);
}

const convertIssueIdsIntoMarkdownLinks = (text: SelectedText): MarkdownText => {
  const { format, url } = getPreferences();

  return text.convertIssueIdsIntoMarkdownLinks(format, url);
};

const replaceSelectedText = (text: MarkdownText): Promise<void> => {
  return Clipboard.paste(text.toClipboardContent());
};

const handleErrors = () => {
  return showToast({
    style: Toast.Style.Failure,
    title: "No text selected",
  });
};
