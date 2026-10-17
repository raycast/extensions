import { Form, ActionPanel, Action, showToast, LocalStorage, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

type ShardInfo = {
  id: string;
  tableName: string;
  schemeName: string;
  schemeSize: number;
  tableSize: number;
  shardFactor: string;
};

// Form submit data type (all fields are strings)
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

  // If not edit mode, restore last data from LocalStorage when component loads
  useEffect(() => {
    if (!isEditMode) {
      async function loadData() {
        try {
          const savedData = await LocalStorage.getItem<string>("shardInfoList");
          if (savedData) {
            const parsedData: ShardInfo[] = JSON.parse(savedData);
            if (parsedData.length > 0) {
              // Use last data as default value
              setShardData(parsedData[parsedData.length - 1]);
            }
          }
        } catch (error) {
          console.error("Failed to load data:", error);
        }
      }
      loadData();
    }
  }, [isEditMode]);

  async function handleSubmit(values: ShardFormData) {
    try {
      // Read existing data
      const existingData = await LocalStorage.getItem<string>("shardInfoList");
      let dataList: ShardInfo[] = [];

      if (existingData) {
        dataList = JSON.parse(existingData);
      }

      // Convert string to number and validate
      const schemeSize = parseInt(values.schemeSize, 10);
      const tableSize = parseInt(values.tableSize, 10);

      // Validate number fields
      if (isNaN(schemeSize) || isNaN(tableSize) || schemeSize <= 0 || tableSize <= 0) {
        showToast({
          title: "Save failed",
          message: "DB count and table count must be valid numbers greater than 0",
        });
        return;
      }

      // Generate ID for new data or use existing ID, and ensure number type is correct
      const dataToSave: ShardInfo = {
        id: isEditMode && shardData.id ? shardData.id : Date.now().toString(),
        tableName: values.tableName,
        schemeName: values.schemeName,
        schemeSize: schemeSize,
        tableSize: tableSize,
        shardFactor: values.shardFactor,
      };

      if (isEditMode && shardData.id) {
        // Edit mode: update existing data
        const index = dataList.findIndex((item) => item.id === shardData.id);
        if (index !== -1) {
          dataList[index] = dataToSave;
        }
      } else {
        // New mode: add new data
        dataList.push(dataToSave);
      }

      // Save data to LocalStorage
      await LocalStorage.setItem("shardInfoList", JSON.stringify(dataList));

      // Update local state
      setShardData(dataToSave);

      // Call callback function (if any)
      if (onSave) {
        onSave(dataToSave);
      }

      showToast({
        title: isEditMode ? "Config updated" : "Data saved",
        message: isEditMode
          ? "Shard config has been successfully updated"
          : "Shard info has been successfully saved to local storage",
      });

      popToRoot();
    } catch (error) {
      console.error("Failed to save data:", error);
      showToast({
        title: "Save failed",
        message: "Failed to save data to local storage",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditMode ? "Save Changes" : "Save Config"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tableName"
        title="Table Name"
        placeholder="Please enter table name"
        defaultValue={shardData.tableName}
      />
      <Form.TextField
        id="schemeName"
        title="DB Name"
        placeholder="Please enter DB name"
        defaultValue={shardData.schemeName}
      />
      <Form.TextField
        id="schemeSize"
        title="DB Count"
        placeholder="Please enter DB count"
        defaultValue={shardData.schemeSize.toString()}
      />
      <Form.TextField
        id="tableSize"
        title="Table Count"
        placeholder="Please enter table count"
        defaultValue={shardData.tableSize.toString()}
      />
      <Form.TextField
        id="shardFactor"
        title="Shard Factor"
        placeholder="Please enter shard factor (e.g. user_id)"
        defaultValue={shardData.shardFactor}
      />
    </Form>
  );
}
