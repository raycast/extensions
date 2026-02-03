import { getPreferences } from "./preferences";
import { handleErrors } from "./error_handler";
import { getSelectedTextOfFrontmostApplication, MarkdownText, SelectedText, replaceSelectedText } from "./selected_text";

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
