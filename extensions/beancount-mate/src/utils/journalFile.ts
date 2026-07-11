import fs from "fs-extra";
import { preferences } from "./preferences";
import { wrapToast } from "./wrapToast";

const placeholders = {
  year: new Date().getFullYear().toString(),
  month: (new Date().getMonth() + 1).toString(),
  monthShortName: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date()),
};

function parseString(template: string, placeholders: Record<string, string>) {
  return template.replace(/\{(.*?)\}/g, (_, key: string) => placeholders[key.trim()]);
}

export const parsedJournalFilePath = parseString(preferences.beancountJournalFilePath as string, placeholders);

export const isJournalFileExists = async () => {
  if (preferences.beancountJournalFilePath == null || preferences.beancountJournalFilePath.length === 0) return false;
  const journalFilePath = parseString(preferences.beancountJournalFilePath, placeholders);
  return await fs.exists(journalFilePath);
};

export const appendDirectivesToJournalFile = wrapToast(
  async (directives: string) => {
    const journalFileContent = await fs.readFile(parsedJournalFilePath, "utf8");
    await fs.outputFile(parsedJournalFilePath, `${journalFileContent}\n${directives}`);
  },
  "Saving...",
  "Journal file saved",
  "Failed to save journal file"
);
