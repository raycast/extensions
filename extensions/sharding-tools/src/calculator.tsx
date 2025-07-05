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
        console.error("读取剪切板失败:", error);
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
        console.error("加载配置失败:", error);
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
        <Form.Description title="暂无配置" text="请先使用添加分库分表配置命令创建配置，然后再使用计算器功能。" />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="计算分片" onSubmit={handleSubmit} shortcut={{ modifiers: [], key: "return" }} />
        </ActionPanel>
      }
    >
      {(allConfigs.length > 1 || (shardInfo && allConfigs.length > 0)) && (
        <Form.Dropdown id="configSelect" title="选择配置" value={selectedConfigId} onChange={setSelectedConfigId}>
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
        title={`${currentConfig?.shardFactor || "分表因子"}值`}
        placeholder={`请输入${currentConfig?.shardFactor || "分表因子"}的值`}
        defaultValue={factorValue}
      />
      {currentConfig && (
        <Form.Description
          title="配置信息"
          text={`库配置: ${currentConfig.schemeName} (${currentConfig.schemeSize}个库)\n表配置: ${currentConfig.tableName} (${currentConfig.tableSize}个表)`}
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
## 快捷SQL

\`\`\`sql
SELECT * FROM ${result.tableName} WHERE ${shardInfo.shardFactor} = ${factorValue};
\`\`\`

## 输入信息
- **${shardInfo.shardFactor || "分表因子"}**: ${factorValue}

## 计算结果
- **库名**: ${result.dbName}${shardInfo.schemeSize > 1 ? ` (${result.dbIndex}号库)` : ""}
- **表名**: ${result.tableName}${shardInfo.tableSize > 1 ? ` (${result.tableIndex}号表)` : ""}

## 配置信息
- **库配置**: ${shardInfo.schemeName} (共${shardInfo.schemeSize}个库)
- **表配置**: ${shardInfo.tableName} (每库${shardInfo.tableSize}个表)
- **总分片数**: ${shardInfo.schemeSize * shardInfo.tableSize}

`;

  const sqlQuery = `SELECT * FROM ${result.tableName} WHERE ${shardInfo.shardFactor} = ${factorValue};`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="复制Sql" content={sqlQuery} />
          <Action.CopyToClipboard title="复制库名" content={result.dbName} />
          <Action.CopyToClipboard title="复制表名" content={result.tableName} />
          <Action.CopyToClipboard
            title="复制完整信息"
            content={`库名: ${result.dbName}\n表名: ${result.tableName}\n${shardInfo.shardFactor || "分表因子"}: ${factorValue}`}
          />
        </ActionPanel>
      }
    />
  );
}
