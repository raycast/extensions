import path from "path"
import {
   Action,
   Icon,
   Keyboard,
   getPreferenceValues,
   showHUD,
} from "@raycast/api"
import fs from "fs/promises"
import type { CursorRule } from "../../types"
import { cursorRuleToMarkdown, expandPath, openInCursor } from "../../utils"

interface Props {
   cursorRule: CursorRule
   onAction?: () => void
}

export const ExportAndEditAction = ({ cursorRule, onAction }: Props) => {
   const handleExportAndEdit = async () => {
      try {
         const fileName = cursorRule.isLocal
            ? `${cursorRule.slug}`
            : `${cursorRule.slug}.md`
         const { exportDirectory } = getPreferenceValues<Preferences>()
         const expandedPath = expandPath(exportDirectory)
         const filePath = path.join(expandedPath, fileName)

         if (cursorRule.isLocal) {
            openInCursor(filePath, undefined, onAction)
         } else {
            const markdownContent = cursorRuleToMarkdown(cursorRule)
            await fs.mkdir(path.dirname(filePath), { recursive: true })
            await fs.writeFile(filePath, markdownContent, "utf-8")
            openInCursor(
               filePath,
               "Cursor rule exported and opened in Cursor",
               onAction,
            )
         }
      } catch (error) {
         console.error("Error exporting cursor rule:", error)
         await showHUD("Failed to export cursor rule.")
      }
   }

   return (
      <Action
         title="Export and Edit Cursor Rule"
         icon={Icon.Pencil}
         shortcut={Keyboard.Shortcut.Common.Edit}
         onAction={handleExportAndEdit}
      />
   )
}
