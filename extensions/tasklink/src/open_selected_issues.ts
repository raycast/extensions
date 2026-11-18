import { getPreferences } from "./preferences";
import { handleErrors } from "./error_handler";
import { getSelectedTextOfFrontmostApplication } from "./selected_text";
import { SelectedText } from "./selected_text";
import { open } from "@raycast/api";

export default async function Command() {
  return getSelectedTextOfFrontmostApplication()
    .then(extractIssueUrlsFromSelectedText)
    .then(openSelectedIssues)
    .catch(handleErrors);
}

const extractIssueUrlsFromSelectedText = (text: SelectedText): string[] => {
  const { format, url } = getPreferences();
  return text.getIssueUrls(format, url);
};

const openSelectedIssues = (urls: string[]): Promise<void[]> => {
  return urls.length > 0
    ? Promise.all(urls.map((url) => open(url)))
    : Promise.reject(new Error("No issue IDs selected"));
};
