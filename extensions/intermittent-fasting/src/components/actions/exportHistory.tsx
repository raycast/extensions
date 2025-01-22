import { Action, Icon, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { EnhancedItem } from "../../types";

interface ExportHistoryProps {
  data: EnhancedItem[];
}

export function ExportHistory({ data }: ExportHistoryProps) {
  const handleExport = async () => {
    const tempFilePath = path.join(os.tmpdir(), "fasting-history.json");

    try {
      const jsonContent = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempFilePath, jsonContent);

      const saveDialog: Promise<string> = new Promise((resolve, reject) => {
        exec(
          `osascript -e 'set chosenFile to choose file name with prompt "Save fasting history as:" default name "fasting-history.json"' -e 'return POSIX path of chosenFile'`,
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

      const savePath = await saveDialog;
      fs.copyFileSync(tempFilePath, savePath);
      await showToast({ style: Toast.Style.Success, title: "History Exported", message: `Saved to: ${savePath}` });
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to export fasting history" });
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  };

  return <Action icon={Icon.Download} title="Export Fasting History" onAction={handleExport} />;
}
