import { List } from "@raycast/api";
import React from "react";
import { EntryListItem } from "./EntryListItem";
import { ForecastEntry } from "../types";

interface EntryListProps {
  entries: ForecastEntry[];
  filteredPerson: string;
  showDetails: boolean;
  toggleDone: (id: number) => void;
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>;
  webUrl: string;
  sectionTitle: string;
  viewDate: Date;
  changeViewDate: (date: Date) => void;
}

export function EntryList({
  entries,
  filteredPerson,
  showDetails,
  toggleDone,
  setShowDetails,
  webUrl,
  sectionTitle,
  viewDate,
  changeViewDate,
}: EntryListProps) {
  const entriesByPerson = (entries || []).reduce((acc: { [key: string]: ForecastEntry[] }, entry: ForecastEntry) => {
    const personName = entry.personName;
    if (!acc[personName]) {
      acc[personName] = [];
    }
    acc[personName].push(entry);
    return acc;
  }, {});

  if (filteredPerson === "all") {
    return (
      <>
        {Object.keys(entriesByPerson)
          .sort()
          .map((personName) => (
            <List.Section
              key={personName}
              title={personName}
              subtitle={`${entriesByPerson[personName].length} assignment${
                entriesByPerson[personName].length === 1 ? "" : "s"
              }`}
            >
              {entriesByPerson[personName]
                .sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? 1 : -1))
                .map((entry: ForecastEntry) => (
                  <EntryListItem
                    key={entry.id}
                    entry={entry}
                    showDetails={showDetails}
                    toggleDone={toggleDone}
                    setShowDetails={setShowDetails}
                    filteredPerson={filteredPerson}
                    webUrl={webUrl}
                    viewDate={viewDate}
                    changeViewDate={changeViewDate}
                  />
                ))}
            </List.Section>
          ))}
      </>
    );
  }

  return (
    <>
      <List.Section
        title={sectionTitle}
        subtitle={`${entries.filter((e) => !e.isDone).length} assignment${
          entries.filter((e) => !e.isDone).length === 1 ? "" : "s"
        }`}
      >
        {entries
          .filter((e) => !e.isDone)
          .map((entry: ForecastEntry) => (
            <EntryListItem
              key={entry.id}
              entry={entry}
              showDetails={showDetails}
              toggleDone={toggleDone}
              setShowDetails={setShowDetails}
              filteredPerson={filteredPerson}
              webUrl={webUrl}
              viewDate={viewDate}
              changeViewDate={changeViewDate}
            />
          ))}
      </List.Section>
      <List.Section
        title="Complete"
        subtitle={`${entries.filter((e) => e.isDone).length} assignment${
          entries.filter((e) => e.isDone).length === 1 ? "" : "s"
        }`}
      >
        {entries
          .filter((e) => e.isDone)
          .map((entry: ForecastEntry) => (
            <EntryListItem
              key={entry.id}
              entry={entry}
              showDetails={showDetails}
              toggleDone={toggleDone}
              setShowDetails={setShowDetails}
              filteredPerson={filteredPerson}
              webUrl={webUrl}
              viewDate={viewDate}
              changeViewDate={changeViewDate}
            />
          ))}
      </List.Section>
    </>
  );
}
