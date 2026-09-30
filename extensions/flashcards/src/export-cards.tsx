import { Detail, ActionPanel, Action, showToast, Toast, Icon, Clipboard, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { Flashcard } from "./types";
import { getAllCards } from "./utils/storage";
import { cardsToMarkdown } from "./utils/serializer";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export default function ExportCards() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setCards(await getAllCards());
      setIsLoading(false);
    })();
  }, []);

  // Generate the Markdown export.
  const markdown = cards.length > 0 ? cardsToMarkdown(cards) : "";

  // Build the detail view preview.
  const previewMarkdown =
    cards.length > 0
      ? `## Export Flashcards\n\n**${cards.length === 1 ? "1 flashcard ready for export:" : `${cards.length} flashcards ready for export:`}**\n\n---\n\n\`\`\`markdown\n${markdown}\n\`\`\``
      : `## Export Flashcards\n\nYou don't have any flashcards to export yet. Go create some first!`;

  // Add the current date to the export filename.
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `flashcards-${dateStr}.md`;

  async function handleCopyToClipboard() {
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Export Successful",
      message: "Markdown copied to clipboard",
    });
  }

  async function handleSaveFile() {
    try {
      // Save to the user's Downloads folder.
      const home = homedir();
      const downloadsPath = join(home, "Downloads");
      const filePath = join(downloadsPath, fileName);
      writeFileSync(filePath, markdown, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Export Successful",
        message: `Saved to: ~/Downloads/${fileName}`,
      });
    } catch {
      // Fall back to the user's Desktop folder.
      try {
        const home = homedir();
        const desktopPath = join(home, "Desktop");
        const filePath = join(desktopPath, fileName);
        writeFileSync(filePath, markdown, "utf-8");
        await showToast({
          style: Toast.Style.Success,
          title: "Export Successful",
          message: `Saved to: ~/Desktop/${fileName}`,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Export failed",
          message: String(err),
        });
      }
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={previewMarkdown}
      actions={
        cards.length > 0 ? (
          <ActionPanel>
            <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={handleCopyToClipboard} />
            <Action
              title="Save to Downloads Folder"
              icon={Icon.Download}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={handleSaveFile}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
