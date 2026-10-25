import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useYabWindow } from "./components";
import { spaceInfos } from "./data";
import { filterFor, HistoryDropdown, HistoryItem, useHistory } from "./history";

export default function Command() {
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("all");
  const [host, setHost] = useState<string>();
  const spaces = useMemo(() => spaceInfos(), []);
  const filter = useMemo(() => ({ ...filterFor(choice), host }), [choice, host]);
  const { data, isLoading } = useHistory(text, filter);
  const { data: window } = useYabWindow({ launch: false });
  const pages = data ?? [];
  const showDetail = pages.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      throttle
      onSearchTextChange={setText}
      navigationTitle={host ? `History · ${host.replace(/^www\./, "")}` : "Search History"}
      searchBarPlaceholder={
        host ? `Search ${host.replace(/^www\./, "")}…` : "Search titles, addresses and the words in pages…"
      }
      searchBarAccessory={<HistoryDropdown onChange={setChoice} spaces={spaces} />}
    >
      <List.EmptyView
        title={text ? "Nothing in your history says that" : "No history yet"}
        description={text ? "Yab looks in titles, addresses and the text of pages it kept." : undefined}
      />
      {pages.map((page) => (
        <HistoryItem
          key={page.key}
          page={page}
          tabs={window?.tabs}
          spaces={spaces}
          showDetail={showDetail}
          onSite={host ? undefined : setHost}
        />
      ))}
    </List>
  );
}
