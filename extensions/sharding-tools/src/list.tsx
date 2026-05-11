import {
  List,
  ActionPanel,
  Action,
  showToast,
  LocalStorage,
  Icon,
  Color,
  useNavigation,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import ShardForm from "./shard-form";
import { ShardCalculator } from "./calculator";
import ImportForm from "./import-form";
import { showFailureToast } from "@raycast/utils";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

// Export config file format
type ExportConfig = {
  version: string;
  exportDate: string;
  configs: ShardInfo[];
};

export default function Command() {
  const [shardDataList, setShardDataList] = useState<ShardInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  // Load data from LocalStorage
  useEffect(() => {
    async function loadData() {
      try {
        const savedData = await LocalStorage.getItem<string>("shardInfoList");
        if (savedData) {
          const parsedData: ShardInfo[] = JSON.parse(savedData);
          setShardDataList(parsedData);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        showFailureToast({
          title: "Load failed",
          message: "Failed to load data from local storage",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Export config
  async function exportConfig() {
    try {
      const exportData: ExportConfig = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        configs: shardDataList,
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // Copy to clipboard
      await Clipboard.copy(jsonString);

      showToast({
        title: "Export success",
        message: `Copied ${shardDataList.length} configs to clipboard`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      showFailureToast({
        title: "Export failed",
        message: "Failed to export config data",
      });
    }
  }

  // Import config
  function importConfig() {
    push(
      <ImportForm
        onImportSuccess={async (importedCount) => {
          // Reload data
          await loadData();
          console.log(`Import completed, imported ${importedCount} configs, data refreshed`);
        }}
      />,
    );
  }

  // Reload data function
  async function loadData() {
    try {
      const savedData = await LocalStorage.getItem<string>("shardInfoList");
      if (savedData) {
        const parsedData: ShardInfo[] = JSON.parse(savedData);
        setShardDataList(parsedData);
      } else {
        setShardDataList([]);
      }
    } catch (error) {
      console.error("Failed to reload data:", error);
    }
  }

  // Clear all data
  async function clearAllData() {
    try {
      await LocalStorage.removeItem("shardInfoList");
      setShardDataList([]);
      showToast({
        title: "Data cleared",
        message: "Shard data has been deleted from local storage",
      });
    } catch (error) {
      console.error("Failed to clear data:", error);
      showFailureToast({
        title: "Clear failed",
        message: "Failed to clear local storage data",
      });
    }
  }

  // Delete single data
  async function deleteData(id: string) {
    try {
      const updatedList = shardDataList.filter((item) => item.id !== id);
      await LocalStorage.setItem("shardInfoList", JSON.stringify(updatedList));
      setShardDataList(updatedList);
      showToast({
        title: "Data deleted",
        message: "Config has been successfully deleted",
      });
    } catch (error) {
      console.error("Failed to delete data:", error);
      showFailureToast({
        title: "Delete failed",
        message: "Failed to delete data",
      });
    }
  }

  // Edit config
  function editConfig(shardInfo: ShardInfo) {
    push(
      <ShardForm
        initialData={shardInfo}
        onSave={(updatedData: ShardInfo) => {
          const updatedList = shardDataList.map((item) => (item.id === updatedData.id ? updatedData : item));
          setShardDataList(updatedList);
        }}
        isEditMode={true}
      />,
    );
  }

  // Open shard calculator
  function openCalculator(shardInfo: ShardInfo) {
    push(<ShardCalculator shardInfo={shardInfo} />);
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (shardDataList.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No shard data"
          description="Please use the add form function to save shard config first"
          actions={
            <ActionPanel>
              <Action
                title="Import Config"
                icon={Icon.Upload}
                onAction={importConfig}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      <List.Section title={`Shard Config Info (${shardDataList.length} configs)`}>
        {shardDataList.map((shardInfo) => {
          const totalShards = shardInfo.schemeSize * shardInfo.tableSize;
          return (
            <List.Item
              key={shardInfo.id}
              title={`${shardInfo.tableName} (${shardInfo.schemeName})`}
              subtitle={`${shardInfo.schemeSize} DBs, ${shardInfo.tableSize} Tables · Shard Factor: ${shardInfo.shardFactor || "Not set"}`}
              accessories={[{ text: `Total ${totalShards} shards`, icon: Icon.Info, tooltip: "Total shards" }]}
              icon={{ source: Icon.Gear, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action
                    title="Shard Calculator"
                    icon={Icon.Calculator}
                    onAction={() => openCalculator(shardInfo)}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action
                    title="Edit Config"
                    icon={Icon.Pencil}
                    onAction={() => editConfig(shardInfo)}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action.CopyToClipboard
                    title="Copy Config Info"
                    content={`Table Name: ${shardInfo.tableName}\nDB Name: ${shardInfo.schemeName}\nDB Count: ${shardInfo.schemeSize}\nTable Count: ${shardInfo.tableSize}\nShard Factor: ${shardInfo.shardFactor || "Not set"}\nTotal Shards: ${totalShards}`}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    icon={Icon.Clipboard}
                  />
                  <Action
                    title="Export All Configs"
                    icon={Icon.Download}
                    onAction={exportConfig}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                  <Action
                    title="Import Config"
                    icon={Icon.Upload}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={importConfig}
                  />
                  <Action
                    title="Delete Config"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteData(shardInfo.id)}
                  />
                  <Action
                    title="Clear All Data"
                    icon={Icon.DeleteDocument}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={clearAllData}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
