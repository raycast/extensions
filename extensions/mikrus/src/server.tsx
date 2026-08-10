import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ServerHookType, ServerType } from "./type/server";
import { useServer } from "./hook/useServer";
import { ServerListView } from "./view/server/list";
import { ServerForm } from "./view/server/form";

export default function Server() {
  const uS = useServer();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const { push } = useNavigation();
  const collectionsServers: ServerHookType = uS;

  useEffect(() => {
    if (searchText != "" && searchText.length > 1) {
      collectionsServers.data = uS.data.filter((x: ServerType) => x.server_name.includes(searchText));
    } else {
      collectionsServers.data = uS.data;
    }
  }, [searchText]);
  useEffect(() => {
    const selected = collectionsServers.data.find((x: ServerType) => x.server_id === selectedServerId);
    if (selected) {
      uS.detail(selected);
      collectionsServers.data = uS.data;
    }
  }, [selectedServerId]);

  const getActionList = (
    <ActionPanel>
      <Action title={"Reload Servers"} icon={Icon.Download} onAction={() => uS.reload()} />
    </ActionPanel>
  );
  const getActionItem = (server: ServerType) => (
    <ActionPanel>
      <Action
        title={"Change"}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        icon={Icon.Pencil}
        onAction={() => push(<ServerForm server={server} use={{ servers: collectionsServers }} />)}
      />
      <Action title={"Restart"} icon={Icon.ArrowClockwise} onAction={() => uS.itemRestart(server)} />
      <Action title={"Amfetamine"} icon={Icon.Wand} onAction={() => uS.itemAmfetamine(server)} />
      <Action title={"Reload Servers"} icon={Icon.Download} onAction={() => uS.reload()} />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={collectionsServers.data.length === 0 ? false : true}
      isLoading={uS.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedServerId || undefined}
      onSelectionChange={(id) => setSelectedServerId(id)}
      searchBarPlaceholder="Search server..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={getActionList}
    >
      {collectionsServers.data.length === 0 ? (
        <List.EmptyView title="No Servers" description="Reload servers by pressing enter" icon={Icon.Stars} />
      ) : (
        <ServerListView
          key="servers"
          title="Servers"
          servers={collectionsServers.data}
          selectedServer={selectedServerId}
          actionPanel={getActionItem}
        />
      )}
    </List>
  );
}
