import { Form, ActionPanel, Action, Detail, useNavigation, Clipboard, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

interface ShardCalculatorProps {
  shardInfo?: ShardInfo;
}

export function ShardCalculator({ shardInfo }: ShardCalculatorProps) {
  const [factorValue, setFactorValue] = useState<string>("");
  const [allConfigs, setAllConfigs] = useState<ShardInfo[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(shardInfo?.id || "");
  const { push } = useNavigation();

  // 组件加载时自动读取剪切板内容和所有配置
  useEffect(() => {
    async function initializeData() {
      // 读取剪切板内容
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setFactorValue(clipboardText.trim());
        }
      } catch (error) {
        console.error("Failed to read clipboard:", error);
      }

      // 加载所有配置
      try {
        const savedData = await LocalStorage.getItem<string>("shardInfoList");
        if (savedData) {
          const parsedData: ShardInfo[] = JSON.parse(savedData);
          setAllConfigs(parsedData);
          // 如果没有传入指定配置，默认选择第一个配置
          if (!shardInfo && parsedData.length > 0) {
            setSelectedConfigId(parsedData[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load configs:", error);
      }
    }
    initializeData();
  }, [shardInfo]);

  // 获取当前选中的配置
  const currentConfig = allConfigs.find((config) => config.id === selectedConfigId) || shardInfo;

  // 计算分库分表
  function calculateShard(value: string) {
    if (!value.trim() || !currentConfig) return null;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return null;

    const dbIndex = numValue % currentConfig.schemeSize;
    const tableIndex = numValue % currentConfig.tableSize;

    return {
      dbIndex,
      tableIndex,
      dbName: currentConfig.schemeName,
      tableName: currentConfig.tableSize === 1 ? currentConfig.tableName : `${currentConfig.tableName}_${tableIndex}`,
    };
  }

  function handleSubmit(values: { factorValue: string }) {
    if (!currentConfig) return;

    const calculatedResult = calculateShard(values.factorValue);
    if (calculatedResult) {
      setFactorValue(values.factorValue);

      // 跳转到结果页面
      push(<ResultDetail result={calculatedResult} factorValue={values.factorValue} shardInfo={currentConfig} />);
    }
  }

  if (allConfigs.length === 0 && !shardInfo) {
    return (
      <Form>
        <Form.Description
          title="No configs"
          text="Please use the add shard config command to create a config, then use the calculator function."
        />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Calculate Shard"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    >
      {(allConfigs.length > 1 || (shardInfo && allConfigs.length > 0)) && (
        <Form.Dropdown id="configSelect" title="Select Config" value={selectedConfigId} onChange={setSelectedConfigId}>
          {allConfigs.map((config) => (
            <Form.Dropdown.Item
              key={config.id}
              value={config.id}
              title={`${config.tableName} (${config.schemeName})`}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextField
        id="factorValue"
        title={`${currentConfig?.shardFactor || "Shard Factor"} value`}
        placeholder={`Please input the value of ${currentConfig?.shardFactor || "Shard Factor"}`}
        defaultValue={factorValue}
      />
      {currentConfig && (
        <Form.Description
          title="Config Info"
          text={`DB Config: ${currentConfig.schemeName} (${currentConfig.schemeSize} DBs)\nTable Config: ${currentConfig.tableName} (${currentConfig.tableSize} Tables)`}
        />
      )}
    </Form>
  );
}

// 默认导出用于独立命令
export default function Command() {
  return <ShardCalculator />;
}

interface ResultDetailProps {
  result: { dbName: string; tableName: string; dbIndex: number; tableIndex: number };
  factorValue: string;
  shardInfo: ShardInfo;
}

function ResultDetail({ result, factorValue, shardInfo }: ResultDetailProps) {
  const markdown = `
## Quick SQL

\`\`\`sql
SELECT * FROM ${result.tableName} WHERE ${shardInfo.shardFactor} = ${factorValue};
\`\`\`

## Input Info
- **${shardInfo.shardFactor || "Shard Factor"}**: ${factorValue}

## Calculation Result
- **DB Name**: ${result.dbName}${shardInfo.schemeSize > 1 ? ` (${result.dbIndex} DB)` : ""}
- **Table Name**: ${result.tableName}${shardInfo.tableSize > 1 ? ` (${result.tableIndex} Table)` : ""}

## Config Info
- **DB Config**: ${shardInfo.schemeName} (${shardInfo.schemeSize} DBs)
- **Table Config**: ${shardInfo.tableName} (${shardInfo.tableSize} Tables)
- **Total Shards**: ${shardInfo.schemeSize * shardInfo.tableSize}

`;

  const sqlQuery = `SELECT * FROM ${result.tableName} WHERE ${shardInfo.shardFactor} = ${factorValue};`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Sql" content={sqlQuery} />
          <Action.CopyToClipboard title="Copy Db Name" content={result.dbName} />
          <Action.CopyToClipboard title="Copy Table Name" content={result.tableName} />
          <Action.CopyToClipboard
            title="Copy Full Info"
            content={`DB Name: ${result.dbName}\nTable Name: ${result.tableName}\n${shardInfo.shardFactor || "Shard Factor"}: ${factorValue}`}
          />
        </ActionPanel>
      }
    />
  );
}
