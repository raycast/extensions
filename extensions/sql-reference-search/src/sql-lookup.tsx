import { Action, ActionPanel, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { SqlEntryDetail, buildEntryMarkdown } from "./components/sql-entry-detail";
import { DIALECT_LABELS, DIALECT_ORDER, ENTRY_TYPE_LABELS } from "./lib/constants";
import { searchEntries, supportsDialect } from "./lib/data";
import { getPreferredDialect, setPreferredDialect } from "./lib/dialect-storage";
import { SQLDialect, SQLEntryType } from "./types";

type Preferences = {
  preferredDialect?: SQLDialect;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [selectedDialect, setSelectedDialect] = useState<SQLDialect>(preferences.preferredDialect ?? "postgres");
  const [selectedType, setSelectedType] = useState<"all" | SQLEntryType>("all");

  useCachedPromise(async () => {
    const stored = await getPreferredDialect();
    setSelectedDialect(stored);
  }, []);

  const entries = useMemo(() => {
    return searchEntries(searchText).filter((entry) => {
      if (!supportsDialect(entry, selectedDialect)) {
        return false;
      }
      if (selectedType !== "all" && entry.type !== selectedType) {
        return false;
      }
      return true;
    });
  }, [searchText, selectedDialect, selectedType]);

  const storeDialect = async (dialect: SQLDialect) => {
    await setPreferredDialect(dialect);
    setSelectedDialect(dialect);
    await showToast({ style: Toast.Style.Success, title: `Default dialect set to ${DIALECT_LABELS[dialect]}` });
  };

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search SQL keyword, function, datatype, or pattern"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Dialect" storeValue onChange={(value) => setSelectedDialect(value as SQLDialect)}>
          {DIALECT_ORDER.map((dialect) => (
            <List.Dropdown.Item key={dialect} title={DIALECT_LABELS[dialect]} value={dialect} />
          ))}
        </List.Dropdown>
      }
      filtering={false}
    >
      <List.Section title={`${entries.length} Results`} subtitle={DIALECT_LABELS[selectedDialect]}>
        {entries.map((entry) => (
          <List.Item
            key={`${entry.type}-${entry.title}`}
            icon={Icon.Book}
            title={entry.title}
            subtitle={entry.summary}
            accessories={[{ text: ENTRY_TYPE_LABELS[entry.type] }]}
            detail={<List.Item.Detail markdown={buildEntryMarkdown(entry, selectedDialect, false)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Full Description"
                  icon={Icon.ArrowRight}
                  target={<SqlEntryDetail entry={entry} initialDialect={selectedDialect} />}
                />
                <Action.CopyToClipboard
                  title={`Copy ${DIALECT_LABELS[selectedDialect]} Syntax`}
                  content={(entry.syntax.overrides?.[selectedDialect] ?? entry.syntax.common).join("\n")}
                />
                {DIALECT_ORDER.map((dialect) => (
                  <Action.Push
                    key={dialect}
                    title={`View as ${DIALECT_LABELS[dialect]}`}
                    target={<SqlEntryDetail entry={entry} initialDialect={dialect} />}
                  />
                ))}
                <Action
                  title={`Set ${DIALECT_LABELS[selectedDialect]} as Default Dialect`}
                  icon={Icon.Gear}
                  onAction={() => storeDialect(selectedDialect)}
                />
                <ActionPanel.Section title="Filter Type">
                  <Action title="All Types" onAction={() => setSelectedType("all")} />
                  <Action title="Keywords" onAction={() => setSelectedType("keyword")} />
                  <Action title="Clauses" onAction={() => setSelectedType("clause")} />
                  <Action title="Functions" onAction={() => setSelectedType("function")} />
                  <Action title="Operators" onAction={() => setSelectedType("operator")} />
                  <Action title="Data Types" onAction={() => setSelectedType("datatype")} />
                  <Action title="Patterns" onAction={() => setSelectedType("pattern")} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
