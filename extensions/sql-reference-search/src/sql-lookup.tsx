import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";
import { SqlEntryDetail, buildEntryMarkdown } from "./components/sql-entry-detail";
import { DIALECT_LABELS, DIALECT_ORDER, ENTRY_TYPE_LABELS } from "./lib/constants";
import { searchEntries, supportsDialect } from "./lib/data";
import { SQLDialect, SQLEntryType } from "./types";

function isSQLDialect(value: string): value is SQLDialect {
  return DIALECT_ORDER.includes(value as SQLDialect);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.SqlLookup>();
  const [searchText, setSearchText] = useState("");
  const [selectedDialect, setSelectedDialect] = useState<SQLDialect>(preferences.preferredDialect ?? "postgres");
  const [selectedType, setSelectedType] = useState<"all" | SQLEntryType>("all");

  const handleDialectChange = (value: string) => {
    if (isSQLDialect(value)) {
      setSelectedDialect(value);
    }
  };

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

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search SQL keyword, function, datatype, or pattern"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Dialect" storeValue value={selectedDialect} onChange={handleDialectChange}>
          {DIALECT_ORDER.map((dialect) => (
            <List.Dropdown.Item key={dialect} title={DIALECT_LABELS[dialect]} value={dialect} />
          ))}
        </List.Dropdown>
      }
      filtering={false}
    >
      <List.Section title={`${entries.length} Results`} subtitle={DIALECT_LABELS[selectedDialect]}>
        {entries.map((entry) => {
          const supportedDialects = DIALECT_ORDER.filter((dialect) => entry.dialects.supported.includes(dialect));
          return (
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
                  {supportedDialects.map((dialect) => (
                    <Action.Push
                      key={dialect}
                      title={`View as ${DIALECT_LABELS[dialect]}`}
                      target={<SqlEntryDetail entry={entry} initialDialect={dialect} />}
                    />
                  ))}
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
          );
        })}
      </List.Section>
    </List>
  );
}
