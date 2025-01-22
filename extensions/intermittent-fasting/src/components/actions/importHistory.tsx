import { Action, Icon, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { exec } from "child_process";
import { EnhancedItem } from "../../types";
import { mergeItems } from "../../storage";

interface StoredItem {
  id: string;
  start: string | Date;
  end: string | Date | null;
  notes?: string;
  mood?: string;
  fastingDuration?: number;
}

export function ImportHistory({ revalidate }: { revalidate: () => Promise<EnhancedItem[]> }) {
  const handleImport = async () => {
    try {
      // Run AppleScript to get file location
      const openDialog: Promise<string> = new Promise((resolve, reject) => {
        exec(
          `osascript -e '
            try
              set theFile to choose file with prompt "Select fasting history file:" ¬
                default location (path to downloads folder) ¬
                of type {"JSON", "public.json"}
              return POSIX path of theFile
            end try
          '`,
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            if (stderr && !stderr.includes("IMKClient")) {
              reject(new Error(stderr));
              return;
            }
            resolve(stdout.trim());
          },
        );
      });

      const filePath = await openDialog;
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parsedData = JSON.parse(fileContent);

      // Validate imported data
      if (!Array.isArray(parsedData)) {
        throw new Error("Invalid file format: expected an array");
      }

      const importedData = parsedData.filter((item): item is StoredItem => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          (item.start instanceof Date || typeof item.start === "string") &&
          (item.end === null || item.end instanceof Date || typeof item.end === "string")
        );
      });

      if (importedData.length === 0) {
        throw new Error("No valid fasting records found in file");
      }

      const newItemsCount = await mergeItems(importedData as EnhancedItem[]);
      await revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "History Imported",
        message: `Added ${newItemsCount} new fasting records`,
      });
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to import fasting history",
      });
    }
  };

  return <Action icon={Icon.Upload} title="Import Fasting History" onAction={handleImport} />;
}
