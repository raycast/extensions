import {
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Flashcard, Preferences } from "./types";
import { getAllCards } from "./utils/storage";
import { cardsToMarkdown } from "./utils/serializer";
import { t } from "./utils/i18n";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export default function ExportCards() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = getPreferenceValues<Preferences>();

  useEffect(() => {
    (async () => {
      setCards(await getAllCards());
      setIsLoading(false);
    })();
  }, []);

  // Markdown-Export generieren
  const markdown = cards.length > 0 ? cardsToMarkdown(cards, language) : "";

  // Vorschau-Text für die Detail-Ansicht
  const previewMarkdown =
    cards.length > 0
      ? `## ${t(language, "export.title")}\n\n**${t(language, "export.count").replace("{n}", String(cards.length))}**\n\n---\n\n\`\`\`markdown\n${markdown}\n\`\`\``
      : `## ${t(language, "export.title")}\n\n${t(language, "export.empty")}`;

  // Export-Dateiname mit Datum
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `flashcards-${dateStr}.md`;

  async function handleCopyToClipboard() {
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: t(language, "export.success"),
      message: t(language, "export.copied"),
    });
  }

  async function handleSaveFile() {
    try {
      // In den Downloads-Ordner des Benutzers speichern
      const home = homedir();
      const downloadsPath = join(home, "Downloads");
      const filePath = join(downloadsPath, fileName);
      writeFileSync(filePath, markdown, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: t(language, "export.success"),
        message: `${t(language, "export.saved")}: ~/Downloads/${fileName}`,
      });
    } catch (e) {
      // Fallback: Desktop
      try {
        const home = homedir();
        const desktopPath = join(home, "Desktop");
        const filePath = join(desktopPath, fileName);
        writeFileSync(filePath, markdown, "utf-8");
        await showToast({
          style: Toast.Style.Success,
          title: t(language, "export.success"),
          message: `${t(language, "export.saved")}: ~/Desktop/${fileName}`,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: t(language, "import.error"),
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
            <Action
              title={t(language, "export.clipboard")}
              icon={Icon.Clipboard}
              onAction={handleCopyToClipboard}
            />
            <Action
              title={t(language, "export.file")}
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={handleSaveFile}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
