import { DEFAULT_ERROR_TITLE, EDGE_NOT_INSTALLED_MESSAGE } from "./common/constants";
import { List, showToast, ToastStyle } from "@raycast/api";
import { NotInstalled } from "./components/NotInstalled";
import { ReactElement, useState } from "react";
import { UrlDetail } from "./schema/types";
import { UrlListItem } from "./components/UrlListItem";
import { useHistorySearch } from "./hooks/useHistorySearch";

type GroupedEntries = Map<string, UrlDetail[]>;

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useHistorySearch(searchText);

  if (error) {
    if (error === EDGE_NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  const groupedEntries = entries ? groupEntries(entries) : undefined;
  const groups = groupedEntries ? Array.from(groupedEntries.keys()) : undefined;

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <UrlListItem entry={e} key={e.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const groupEntries = (allEntries: UrlDetail[]): GroupedEntries =>
  allEntries.reduce((grouped, e) => {
    const title = groupTitle(e.lastVisited);
    const groupEntries = grouped.get(title) ?? [];
    groupEntries.push(e);
    grouped.set(title, groupEntries);
    return grouped;
  }, new Map<string, UrlDetail[]>());

const groupTitle = (d: Date): string => {
  return new Date(d.toDateString()).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
