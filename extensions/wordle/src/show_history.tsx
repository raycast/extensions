import { useState } from "react";
import { LaunchProps, List } from "@raycast/api";
import { usePersistence } from "@src/hooks";
import { Language } from "@src/types";
import { EntriesEmptyView, HistoryListItem } from "@src/components";
import { getLocalStorageEntryId } from "@src/util";

export default function show_history({ launchContext }: LaunchProps) {
  const languageOptions = Object.values(Language);
  const { language } = { ...launchContext } as { language: Language };
  const initialLanguages = (language && [language]) || languageOptions;
  const [languages, setLanguages] = useState<Language[]>(initialLanguages);
  const { entries, isLoading, deleteAllEntries, deleteEntry } = usePersistence(languages);

  const areEntriesExisting = entries && entries.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={areEntriesExisting}
      searchBarPlaceholder="Filter by state, guess or solution"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Languages"
          placeholder="Filter languages"
          value={JSON.stringify(languages)}
          onChange={(value) => {
            const selectedLanguages: Language[] = JSON.parse(value);
            setLanguages(selectedLanguages);
          }}
        >
          {[
            { title: "All", value: JSON.stringify(languageOptions) },
            ...languageOptions.map((language) => ({ title: language, value: JSON.stringify([language]) })),
          ].map((item) => (
            <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
          ))}
        </List.Dropdown>
      }
    >
      {entries &&
        entries.map((entry) => (
          <HistoryListItem
            key={getLocalStorageEntryId({ date: entry.date, language: entry.language })}
            entry={entry}
            deleteAllEntries={deleteAllEntries}
            deleteEntry={deleteEntry}
          />
        ))}
      {!areEntriesExisting && <EntriesEmptyView selectedLanguages={languages} />}
    </List>
  );
}
