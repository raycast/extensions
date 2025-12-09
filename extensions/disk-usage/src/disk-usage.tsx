import { List } from "@raycast/api";
import { useMachine } from "@xstate/react";
import { homedir } from "node:os";

import { StatusView } from "./components/StatusView";
import { useSelection } from "./hooks/use-selection";
import { diskUsageMachine } from "./machines/disk-usage-machine";
import { HomeDirectoryView } from "./components/HomeDirectoryView";
import { useState } from "react";

const homeDir = homedir();

export default function Command() {
  const [search, setSearch] = useState("");
  const [state, send] = useMachine(diskUsageMachine);

  const selection = useSelection();
  const navTitle = selection.size > 0 ? `${homeDir} — ${selection.size} selected` : undefined;

  const isLoading = !state.matches("ready") && !state.matches("failure");

  return (
    <List
      navigationTitle={navTitle}
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      filtering={search === ""}
      searchBarPlaceholder="Search files..."
      throttle
    >
      <StatusView state={state} send={send} />

      <HomeDirectoryView search={search} state={state} send={send} />
    </List>
  );
}
