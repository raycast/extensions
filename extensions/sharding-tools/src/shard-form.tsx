import { Form, ActionPanel, Action, showToast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

// 表单提交的数据类型（所有字段都是字符串）
type ShardFormData = {
  tableName: string;
  schemeName: string;
  schemeSize: string;
  tableSize: string;
  shardFactor: string;
};

interface ShardFormProps {
  initialData?: ShardInfo;
  onSave?: (data: ShardInfo) => void;
  isEditMode?: boolean;
}

const defaultShardInfo: ShardInfo = {
  id: "",
  tableName: "",
  schemeName: "",
  schemeSize: 0,
  tableSize: 0,
  shardFactor: "",
};

export default function ShardForm({ initialData, onSave, isEditMode = false }: ShardFormProps) {
  const [shardData, setShardData] = useState<ShardInfo>(initialData || defaultShardInfo);

  // 如果不是编辑模式，组件加载时从 LocalStorage 恢复最后一次的数据
  useEffect(() => {
    if (!isEditMode) {
      async function loadData() {
        try {
          const savedData = await LocalStorage.getItem<string>("shardInfoList");
          if (savedData) {
            const parsedData: ShardInfo[] = JSON.parse(savedData);
            if (parsedData.length > 0) {
              // 使用最后一条数据作为默认值
              setShardData(parsedData[parsedData.length - 1]);
            }
          }
        } catch (error) {
          console.error("加载数据失败:", error);
        }
      }
      loadData();
    }
  }, [isEditMode]);

  async function handleSubmit(values: ShardFormData) {
    try {
      // 读取现有数据
      const existingData = await LocalStorage.getItem<string>("shardInfoList");
      let dataList: ShardInfo[] = [];

      if (existingData) {
        dataList = JSON.parse(existingData);
      }

      // 转换字符串为数字并验证
      const schemeSize = parseInt(values.schemeSize, 10);
      const tableSize = parseInt(values.tableSize, 10);

      // 验证数字字段
      if (isNaN(schemeSize) || isNaN(tableSize) || schemeSize <= 0 || tableSize <= 0) {
        showToast({
          title: "保存失败",
          message: "库数量和表数量必须是大于0的有效数字",
        });
        return;
      }

      // 为新数据生成ID或使用现有ID，并确保数字类型正确
      const dataToSave: ShardInfo = {
        id: isEditMode && shardData.id ? shardData.id : Date.now().toString(),
        tableName: values.tableName,
        schemeName: values.schemeName,
        schemeSize: schemeSize,
        tableSize: tableSize,
        shardFactor: values.shardFactor,
      };

      if (isEditMode && shardData.id) {
        // 编辑模式：更新现有数据
        const index = dataList.findIndex((item) => item.id === shardData.id);
        if (index !== -1) {
          dataList[index] = dataToSave;
        }
      } else {
        // 新增模式：添加新数据
        dataList.push(dataToSave);
      }

      // 保存数据到 LocalStorage
      await LocalStorage.setItem("shardInfoList", JSON.stringify(dataList));

      // 更新本地状态
      setShardData(dataToSave);

      // 调用回调函数（如果有的话）
      if (onSave) {
        onSave(dataToSave);
      }

      console.log(isEditMode ? "更新的数据:" : "保存的数据:", dataToSave);
      showToast({
        title: isEditMode ? "配置已更新" : "数据已保存",
        message: isEditMode ? "分库分表配置已成功更新" : "分库分表信息已成功保存到本地存储",
      });
    } catch (error) {
      console.error("保存数据失败:", error);
      showToast({
        title: "保存失败",
        message: "无法保存数据到本地存储",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditMode ? "保存修改" : "保存配置"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="tableName" title="表名" placeholder="请输入表名" defaultValue={shardData.tableName} />
      <Form.TextField id="schemeName" title="库名" placeholder="请输入库名" defaultValue={shardData.schemeName} />
      <Form.TextField
        id="schemeSize"
        title="库数量"
        placeholder="请输入库数量"
        defaultValue={shardData.schemeSize.toString()}
      />
      <Form.TextField
        id="tableSize"
        title="表数量"
        placeholder="请输入表数量"
        defaultValue={shardData.tableSize.toString()}
      />
      <Form.TextField
        id="shardFactor"
        title="分表因子"
        placeholder="请输入分表因子 (如: user_id)"
        defaultValue={shardData.shardFactor}
      />
    </Form>
  );
}
