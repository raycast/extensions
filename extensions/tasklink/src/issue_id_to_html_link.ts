import { showToast, Clipboard, Toast } from "@raycast/api";
import { getPreferences } from "./preferences";
import { getSelectedTextOfFrontmostApplication, HtmlText, SelectedText } from "./selected_text";

export default async function Command() {
  return getSelectedTextOfFrontmostApplication()
    .then(convertIssueIdsIntoHtmlLinks)
    .then(replaceSelectedText)
    .catch(handleErrors);
}

const convertIssueIdsIntoHtmlLinks = (text: SelectedText): HtmlText => {
  const { format, url } = getPreferences();

  return text.convertIssueIdsIntoHtmlLinks(format, url);
};

const replaceSelectedText = (text: HtmlText): Promise<void> => {
  return Clipboard.paste(text.toClipboardContent());
};

const handleErrors = () => {
  return showToast({
    style: Toast.Style.Failure,
    title: "No text selected",
  });
};
