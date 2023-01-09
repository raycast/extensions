import { preferences } from "./preferences";
import fs from "fs-extra";
import { clearSearchBar, showToast, Toast } from "@raycast/api";

const placeholders = {
  year: new Date().getFullYear().toString(),
  month: (new Date().getMonth() + 1).toString(),
  monthShortName: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date()),
};

function parseString(template: string, placeholders: Record<string, string>) {
  return template.replace(/\{(.*?)\}/g, (_, key: string) => placeholders[key.trim()]);
}

export const isJournalFileExists = () => {
  if (preferences.beancountJournalFilePath == null || preferences.beancountJournalFilePath.length === 0) return false;
  const journalFilePath = parseString(preferences.beancountJournalFilePath, placeholders);
  return fs.existsSync(journalFilePath);
};

export const appendDirectivesToJournalFile = async (directives: string) => {
  const journalFilePath = parseString(preferences.beancountJournalFilePath as string, placeholders);

  const toast = await showToast({ title: "Saving...", style: Toast.Style.Animated });

  try {
    const journalFileContent = await fs.readFile(journalFilePath, "utf8");

    const newContent = Buffer.from(`${journalFileContent}\n${directives}`).toString();

    await fs.outputFile(journalFilePath, newContent);

    toast.style = Toast.Style.Success;
    toast.title = "Journal file saved";
    clearSearchBar({ forceScrollToTop: true });
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save journal file";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
};
