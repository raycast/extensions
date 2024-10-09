import { Action, getPreferenceValues, Icon, Keyboard, showHUD } from "@raycast/api";
import { CursorRule } from "../../types";
import { cursorRuleToMarkdown } from "../../utils";
import fs from "fs/promises";
import path from "path";
import { homedir } from "os";
import { exec } from "child_process";

interface Props {
  cursorRule: CursorRule;
  onAction?: () => void;
}

export const ExportAndEditAction = ({ cursorRule, onAction }: Props) => {
  const handleExportAndEdit = async () => {
    try {
      const fileName = cursorRule.isLocal ? `${cursorRule.slug}` : `${cursorRule.slug}.md`;
      const { exportDirectory } = getPreferenceValues<Preferences>();
      const expandedPath = exportDirectory.replace(/^~/, homedir());
      const filePath = path.join(expandedPath, fileName);

      const openFile = () => {
        exec(`cursor ${filePath}`, async (error) => {
          if (error) {
            console.error("Error opening file with Cursor:", error);
            await showHUD("Failed to open file with Cursor. Check if Cursor shell command is available.");
          } else {
            await showHUD("Cursor rule exported and opened in Cursor");
            onAction?.();
          }
        });
      };

      if (cursorRule.isLocal) {
        openFile();
      } else {
        const markdownContent = cursorRuleToMarkdown(cursorRule);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, markdownContent, "utf-8");
        openFile();
      }
    } catch (error) {
      console.error("Error exporting cursor rule:", error);
      await showHUD("Failed to export cursor rule. Check if Cursor shell command is available.");
    }
  };

  return (
    <Action
      title="Export and Edit Cursor Rule"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      onAction={handleExportAndEdit}
    />
  );
};
