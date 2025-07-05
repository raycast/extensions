import { Form, ActionPanel, Action, showToast, LocalStorage, Icon, useNavigation, Clipboard } from "@raycast/api";
import { useState } from "react";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

// 导入配置文件格式
type ImportConfig = {
  version?: string;
  exportDate?: string;
  configs: ShardInfo[];
};

interface ImportFormProps {
  onImportSuccess?: (importedCount: number) => void;
}

export default function ImportForm({ onImportSuccess }: ImportFormProps) {
  const [configData, setConfigData] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  // 验证和解析 JSON 数据
  function validateAndParseConfig(jsonString: string): ImportConfig | null {
    try {
      const parsed = JSON.parse(jsonString);

      // 支持两种格式：
      // 1. 直接的数组格式（旧格式）
      // 2. 带有版本信息的对象格式（新格式）
      let configs: ShardInfo[];

      if (Array.isArray(parsed)) {
        // 旧格式：直接是配置数组
        configs = parsed;
      } else if (parsed.configs && Array.isArray(parsed.configs)) {
        // 新格式：包含版本信息的对象
        configs = parsed.configs;
      } else {
        throw new Error("不支持的配置格式");
      }

      // 验证配置数据结构并转换类型
      const validatedConfigs: ShardInfo[] = [];

      for (const config of configs) {
        if (!config.tableName || !config.schemeName) {
          throw new Error("配置数据格式错误：缺少必需字段 tableName 或 schemeName");
        }

        // 处理数字字段，支持字符串和数字类型
        let schemeSize: number;
        let tableSize: number;

        if (typeof config.schemeSize === "string") {
          schemeSize = parseInt(config.schemeSize, 10);
        } else if (typeof config.schemeSize === "number") {
          schemeSize = config.schemeSize;
        } else {
          throw new Error("配置数据格式错误：schemeSize 必须是数字或数字字符串");
        }

        if (typeof config.tableSize === "string") {
          tableSize = parseInt(config.tableSize, 10);
        } else if (typeof config.tableSize === "number") {
          tableSize = config.tableSize;
        } else {
          throw new Error("配置数据格式错误：tableSize 必须是数字或数字字符串");
        }

        // 验证数字有效性
        if (isNaN(schemeSize) || isNaN(tableSize) || schemeSize <= 0 || tableSize <= 0) {
          throw new Error("配置数据格式错误：库数量和表数量必须是大于0的有效数字");
        }

        // 构造正确的配置对象
        const validatedConfig: ShardInfo = {
          id: config.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          tableName: config.tableName,
          schemeName: config.schemeName,
          schemeSize: schemeSize,
          tableSize: tableSize,
          shardFactor: config.shardFactor || "",
        };

        validatedConfigs.push(validatedConfig);
      }

      return { configs: validatedConfigs };
    } catch (error) {
      console.error("解析配置失败:", error);
      return null;
    }
  }

  // 处理导入
  async function handleImport(values: { configData: string; importMode: string }) {
    if (!values.configData.trim()) {
      showToast({
        title: "导入失败",
        message: "请输入配置数据",
      });
      return;
    }

    setIsLoading(true);

    try {
      const importConfig = validateAndParseConfig(values.configData);

      if (!importConfig) {
        showToast({
          title: "导入失败",
          message: "配置数据格式错误，请检查 JSON 格式",
        });
        return;
      }

      // 读取现有数据
      const existingData = await LocalStorage.getItem<string>("shardInfoList");
      let currentConfigs: ShardInfo[] = [];

      if (existingData) {
        currentConfigs = JSON.parse(existingData);
      }

      let finalConfigs: ShardInfo[];

      if (values.importMode === "replace") {
        // 替换模式：直接使用导入的配置
        finalConfigs = importConfig.configs;
      } else {
        // 合并模式：合并配置，避免重复
        const existingIds = new Set(currentConfigs.map((c) => c.id));
        const newConfigs = importConfig.configs.map((config) => {
          // 如果 ID 已存在，生成新的 ID
          if (existingIds.has(config.id)) {
            return {
              ...config,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            };
          }
          return config;
        });

        finalConfigs = [...currentConfigs, ...newConfigs];
      }

      // 保存到 LocalStorage
      await LocalStorage.setItem("shardInfoList", JSON.stringify(finalConfigs));

      showToast({
        title: "导入成功",
        message: `已导入 ${importConfig.configs.length} 个配置`,
      });

      // 先调用成功回调，让列表页面更新数据
      if (onImportSuccess) {
        onImportSuccess(importConfig.configs.length);
      }

      // 延迟一点时间再返回上一页，确保数据已经更新
      setTimeout(() => {
        pop();
      }, 100);
    } catch (error) {
      console.error("导入失败:", error);
      showToast({
        title: "导入失败",
        message: "无法保存配置数据",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 从剪贴板读取数据
  async function loadFromClipboard() {
    try {
      const clipboardText = await Clipboard.readText();

      if (clipboardText) {
        setConfigData(clipboardText);
        showToast({
          title: "已读取剪贴板",
          message: "配置数据已从剪贴板载入",
        });
      } else {
        showToast({
          title: "剪贴板为空",
          message: "剪贴板中没有可用的文本数据",
        });
      }
    } catch (error) {
      console.error("读取剪贴板失败:", error);
      showToast({
        title: "读取失败",
        message: "无法读取剪贴板内容",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="导入配置" icon={Icon.Upload} onSubmit={handleImport} />
          <Action
            title="从剪贴板读取"
            icon={Icon.Clipboard}
            onAction={loadFromClipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="configData"
        title="配置数据"
        placeholder="请粘贴 JSON 格式的配置数据..."
        value={configData}
        onChange={setConfigData}
        info="支持从导出功能生成的 JSON 数据或直接的配置数组格式"
      />

      <Form.Separator />

      <Form.Dropdown
        id="importMode"
        title="导入模式"
        value={importMode}
        onChange={(value) => setImportMode(value as "merge" | "replace")}
        info="选择如何处理导入的配置数据"
      >
        <Form.Dropdown.Item value="merge" title="合并配置" icon={Icon.Plus} />
        <Form.Dropdown.Item value="replace" title="替换配置" icon={Icon.RotateClockwise} />
      </Form.Dropdown>

      <Form.Description
        title="说明"
        text="• 合并模式：将导入的配置添加到现有配置中&#10;• 替换模式：用导入的配置替换所有现有配置&#10;• 可使用 ⌘V 快捷键从剪贴板读取数据"
      />
    </Form>
  );
}
