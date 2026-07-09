import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useLanguages } from "./hooks/useLanguages";
import { formattedDate } from "./utils/formatting";
import { useNotebook } from "./hooks/useNotebook";
import { getTodayCount, getWeekCount } from "./utils/statistics";
import { getColor } from "./utils/colors";
import { useCachedState } from "@raycast/utils";
import { ImportForm } from "./components/ImportForm";
import { addEntry } from "./data/data";
import { ExportForm } from "./components/ExportForm";
import { EmptyLanguagesView } from "./components/EmptyLanguagesView";
import { useEffect } from "react";

export default function Command() {
  const { languages, refresh: refreshLanguages } = useLanguages();
  const [selectedLanguageId, setSelectedLanguageId] = useCachedState<string>("stat-lang", languages[0]?.id ?? "");
  const { entries, refresh: refreshEntries } = useNotebook(selectedLanguageId);

  const resolvedEntries = entries ?? [];
  const markdown = [
    `\`${languages.find((l) => l.id === selectedLanguageId)?.name ?? ""}\`\n`,
    "```",
    `Total Count: ${resolvedEntries.length.toString()}; Total Today: ${getTodayCount(resolvedEntries).toString()}; Total This Week: ${getWeekCount(resolvedEntries).toString()}\n`,
    resolvedEntries.map((e) => `${formattedDate(e.timestamp)} | ${e.word} - ${e.translation}`).join("\n"),
    "```",
  ].join("\n");

  useEffect(() => {
    if (languages.find((l) => l.id === selectedLanguageId) === undefined && languages.length > 0) {
      setSelectedLanguageId(languages[0].id);
    }
  }, [languages]);

  if (languages.length === 0) {
    return <EmptyLanguagesView onLanguageAdded={refreshLanguages} />;
  }

  return (
    <Detail
      isLoading={entries === undefined}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Language">
            {languages.map((language, index) => (
              <Action
                key={language.id}
                title={language.name}
                icon={{ source: Icon.Dot, tintColor: getColor(language.color) }}
                onAction={() => setSelectedLanguageId(language.id)}
                shortcut={
                  index < 5 ? { modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent } : undefined
                }
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            <Action.Push
              title="Import from File"
              icon={Icon.Download}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
              target={
                <ImportForm
                  onImport={(content) => {
                    const lines = content.split("\n").filter((l) => l.trim());
                    for (const line of lines) {
                      const sepIdx = line.indexOf(" | ");
                      if (sepIdx === -1) continue;

                      const timestamp = new Date(line.slice(0, sepIdx).trim()).getTime();
                      if (isNaN(timestamp)) continue;
                      const rest = line.slice(sepIdx + 3).trim();
                      const splitIdx = rest.indexOf(" - ");
                      if (splitIdx === -1) continue;
                      const word = rest.slice(0, splitIdx).trim();
                      const translation = rest.slice(splitIdx + 3).trim();
                      if (!word || !translation) continue;
                      try {
                        addEntry(word, translation, selectedLanguageId, timestamp);
                      } catch {
                        /* duplicate */
                      }
                    }
                    refreshEntries();
                  }}
                />
              }
            />
            <Action.Push
              title="Export"
              icon={Icon.Upload}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "e" },
                Windows: { modifiers: ["ctrl", "shift"], key: "e" },
              }}
              target={
                <ExportForm
                  languageName={languages.find((l) => l.id === selectedLanguageId)?.name ?? "notebook"}
                  content={resolvedEntries
                    .map((e) => `${new Date(e.timestamp).toISOString()} | ${e.word} - ${e.translation}`)
                    .join("\n")}
                />
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
