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
} from "@raycast/api";
import { useEffect, useState } from "react";
import ShardForm from "./shard-form";
import { ShardCalculator } from "./calculator";
import ImportForm from "./import-form";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

// 导出配置文件格式
type ExportConfig = {
  version: string;
  exportDate: string;
  configs: ShardInfo[];
};

export default function Command() {
  const [shardDataList, setShardDataList] = useState<ShardInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  // 从 LocalStorage 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        const savedData = await LocalStorage.getItem<string>("shardInfoList");
        if (savedData) {
          const parsedData: ShardInfo[] = JSON.parse(savedData);
          setShardDataList(parsedData);
        }
      } catch (error) {
        console.error("加载数据失败:", error);
        showToast({
          title: "加载失败",
          message: "无法从本地存储加载数据",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 导出配置
  async function exportConfig() {
    try {
      const exportData: ExportConfig = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        configs: shardDataList,
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // 复制到剪贴板
      await Clipboard.copy(jsonString);

      showToast({
        title: "导出成功",
        message: `已将 ${shardDataList.length} 个配置复制到剪贴板`,
      });
    } catch (error) {
      console.error("导出失败:", error);
      showToast({
        title: "导出失败",
        message: "无法导出配置数据",
      });
    }
  }

  // 导入配置
  function importConfig() {
    push(
      <ImportForm
        onImportSuccess={async (importedCount) => {
          // 重新加载数据
          await loadData();
          console.log(`导入完成，已导入 ${importedCount} 个配置，数据已刷新`);
        }}
      />,
    );
  }

  // 重新加载数据的函数
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
      console.error("重新加载数据失败:", error);
    }
  }

  // 清除所有数据
  async function clearAllData() {
    try {
      await LocalStorage.removeItem("shardInfoList");
      setShardDataList([]);
      showToast({
        title: "数据已清除",
        message: "本地存储的分库分表数据已删除",
      });
    } catch (error) {
      console.error("清除数据失败:", error);
      showToast({
        title: "清除失败",
        message: "无法清除本地存储数据",
      });
    }
  }

  // 删除单条数据
  async function deleteData(id: string) {
    try {
      const updatedList = shardDataList.filter((item) => item.id !== id);
      await LocalStorage.setItem("shardInfoList", JSON.stringify(updatedList));
      setShardDataList(updatedList);
      showToast({
        title: "数据已删除",
        message: "配置已成功删除",
      });
    } catch (error) {
      console.error("删除数据失败:", error);
      showToast({
        title: "删除失败",
        message: "无法删除数据",
      });
    }
  }

  // 编辑配置
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

  // 进入分库分表计算器
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
          title="暂无分库分表数据"
          description="请先使用添加表单功能保存分库分表配置"
          actions={
            <ActionPanel>
              <Action
                title="导入配置"
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
      <List.Section title={`分库分表配置信息 (${shardDataList.length} 个配置)`}>
        {shardDataList.map((shardInfo) => {
          const totalShards = shardInfo.schemeSize * shardInfo.tableSize;
          return (
            <List.Item
              key={shardInfo.id}
              title={`${shardInfo.tableName} (${shardInfo.schemeName})`}
              subtitle={`${shardInfo.schemeSize} 个库，每库 ${shardInfo.tableSize} 个表 · 分表因子: ${shardInfo.shardFactor || "未设置"}`}
              accessories={[{ text: `总计 ${totalShards} 个分片`, icon: Icon.Info, tooltip: "分片总数" }]}
              icon={{ source: Icon.Gear, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="分库分表计算器" icon={Icon.Calculator} onAction={() => openCalculator(shardInfo)} />
                  <Action title="编辑配置" icon={Icon.Pencil} onAction={() => editConfig(shardInfo)} />
                  <Action.CopyToClipboard
                    title="复制配置信息"
                    content={`表名: ${shardInfo.tableName}\n库名: ${shardInfo.schemeName}\n库数量: ${shardInfo.schemeSize}\n表数量: ${shardInfo.tableSize}\n分表因子: ${shardInfo.shardFactor || "未设置"}\n总分片数: ${totalShards}`}
                    icon={Icon.Clipboard}
                  />
                  <Action
                    title="导出所有配置"
                    icon={Icon.Download}
                    onAction={exportConfig}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                  <Action
                    title="导入配置"
                    icon={Icon.Upload}
                    onAction={importConfig}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  />
                  <Action
                    title="删除配置"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteData(shardInfo.id)}
                  />
                  <Action
                    title="清除所有数据"
                    icon={Icon.DeleteDocument}
                    style={Action.Style.Destructive}
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
