import {
  Action,
  ActionPanel,
  Icon,
  List,
  useNavigation,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { IConfigDB } from "@src/interface";
import { buildDatabaseIcon, deleteAllConfig, deleteConfig } from "@src/util";
import Query from "./query";
import { GetAccessories } from "./components/GetAccessories";
import ConnectDatabase from "./connect-database";
import useConfigData from "./hooks/useConfigData";
import { LOCAL_STORAGE_TYPE } from "./constants";
import { DestructiveAction } from "./components/DestructiveAction";

export default function DatabaseList() {
  const { push } = useNavigation();

  const { data: databaseList, setData: setDatabaseList, isLoading, error } = useConfigData();

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to get database connection`,
    });
  }

  const handleRemoveConfig = async (item: IConfigDB) => {
    const foundIndex = databaseList?.dbConfigs.findIndex(configItem => configItem.id == item.id);

    if (foundIndex != undefined && foundIndex != -1) {
      await deleteConfig(
        foundIndex,
        LOCAL_STORAGE_TYPE.CONFIG_DATA
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDatabaseList && setDatabaseList((prevState: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newConfigs = prevState?.dbConfigs.filter((configItem: any) => configItem.id != item.id)
        return ({ ...prevState, dbConfigs: newConfigs })
      });
    }
  };

  const handleRemove = (item: IConfigDB) => {
    handleRemoveConfig(item)
    return;
  }

  const handleEdit = (item: IConfigDB) => {
    push(<ConnectDatabase draftValues={item} />);
    return;
  };

  const handleRemoveAll = async () => {
    if (await confirmAlert({ title: "Are you sure?" })) {
      deleteAllConfig();
      setDatabaseList({ dbConfigs: [] })
    }
  };

  const handleQuery = (item: IConfigDB) => {
    push(<Query config={item} />);
  };

  const handleCreate = () => {
    push(<ConnectDatabase  />);
    return;
  };


  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter connections...">
      <List.EmptyView title="No connection database"
        description="Create connection data config to start query"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Cog}
              title="Create Connection"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<ConnectDatabase />}
            />
          </ActionPanel>
        }
      />
      <List.Section subtitle={"List databases"}>
        {databaseList?.dbConfigs?.length &&
          databaseList.dbConfigs?.map(item => {
            const subtitle = `${item.host}:${item.port} ${item.user}`;
            return (
              <List.Item
                id={item.id}
                key={item.id}
                title={item.database}
                subtitle={subtitle}
                icon={buildDatabaseIcon(item.databaseType)}
                accessories={GetAccessories(item)}
                actions={
                  <ActionPanel>
                    <Action
                      title="Query"
                      icon={Icon.CodeBlock}
                      onAction={() => handleQuery(item)}
                    />
                    <Action
                      shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
                      title="Edit Connection"
                      icon={Icon.Pencil}
                      onAction={() => handleEdit(item)}
                    />
                    <Action
                      title="Create New Connection"
                      icon={Icon.PlusCircle}
                      onAction={() => handleCreate()}
                    />
                    <ActionPanel.Section title="Delete">
                      <DestructiveAction
                        title="Delete Connection"
                        icon={Icon.XMarkCircle}
                        onAction={() => handleRemove(item)}
                        dialog={{
                          title: `Are you sure you want to delete this connection`,
                        }}
                      />
                      <DestructiveAction
                        shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                        title="Delete All Connection"
                        dialog={{
                          title: "Are you sure you want to delete all connections?",
                        }}
                        onAction={handleRemoveAll}
                      />
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
