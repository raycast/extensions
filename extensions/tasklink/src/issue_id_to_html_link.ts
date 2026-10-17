import { getPreferences } from "./preferences";
import { handleErrors } from "./error_handler";
import { getSelectedTextOfFrontmostApplication, replaceSelectedText } from "./selected_text";
import { SelectedText, HtmlText } from "./selected_text";

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
