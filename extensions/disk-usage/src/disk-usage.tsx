import { homedir } from "node:os";
import { List } from "@raycast/api";
import { useMachine } from "@xstate/react";
import { useState } from "react";
import { HomeDirectoryView } from "./components/HomeDirectoryView";
import { StatusView } from "./components/StatusView";
import { useSelection } from "./hooks/use-selection";
import { diskUsageMachine } from "./machines/disk-usage-machine";

const homeDir = homedir();

export default function Command() {
  const [search, setSearch] = useState("");
  const [state, send] = useMachine(diskUsageMachine);

  const selection = useSelection();
  const navTitle = selection.size > 0 ? `${homeDir} — ${selection.size} selected` : "Disk Space Explorer";

  const isLoading = state.matches("scanning") || state.matches("loadingUsage");

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
