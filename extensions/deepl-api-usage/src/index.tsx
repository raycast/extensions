import {
  List,
  ActionPanel,
  Action,
  Detail,
  Form,
  useNavigation,
  showToast,
  Toast,
  LocalStorage,
  Color,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { FormValidation, getProgressIcon, useForm } from "@raycast/utils";
import fetch from "node-fetch";
import { cond, stubTrue } from "lodash";

interface Usage {
  usedCharacters: number;
  totalCharacters: number;
}

interface Record {
  id: string;
  title: string;
  description: string;
  apiKey: string;
  usage: Usage;
}

const colorMapper = cond([
  [(percentage: number) => percentage < 0.1, () => Color.SecondaryText],
  [(percentage: number) => percentage < 0.4, () => Color.Green],
  [(percentage: number) => percentage < 0.6, () => Color.Blue],
  [(percentage: number) => percentage < 0.8, () => Color.Orange],
  [stubTrue, () => Color.Red],
]);

export default function RecordList() {
  const [records, setRecords] = useState<Record[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const storedRecords = await LocalStorage.getItem<string>("records");
    if (storedRecords) {
      const parsedRecords = JSON.parse(storedRecords) as Record[];
      setRecords(parsedRecords);

      try {
        showToast(Toast.Style.Animated, "Fetching usage...");
        const updatedRecords = await Promise.all(
          parsedRecords.map(async (record) => ({
            ...record,
            // 考虑异常情况
            usage: await fetchUsage(record.apiKey),
          })),
        );
        setRecords(updatedRecords);
      } catch (err: any) {
        showToast(Toast.Style.Failure, "Network Error", "Prioritize using cache, please refresh later");
        return;
      }

      showToast(Toast.Style.Success, "Fetch usage success");
    }
  };

  const handleDelete = async (id: string) => {
    const updatedRecords = records.filter((record) => record.id !== id);
    setRecords(updatedRecords);
    await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
    showToast(Toast.Style.Success, "Record deleted");
    loadRecords();
  };

  const addRecordNode = (
    <Action.Push
      title="Add Record"
      icon={Icon.Plus}
      target={
        <EditRecordForm
          onConfirm={async (newRecord) => {
            const updatedRecords = [...records, newRecord];
            await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
            showToast(Toast.Style.Success, "Record added");
            loadRecords();
          }}
          isNew
        />
      }
    />
  );

  const refreshNode = (
    <Action
      title="Refresh Usage"
      icon={Icon.Repeat}
      onAction={() => {
        loadRecords();
      }}
    />
  );

  return (
    <List
      actions={
        <ActionPanel>
          {addRecordNode}
          {refreshNode}
        </ActionPanel>
      }
    >
      {records.length === 0 ? (
        <List.EmptyView title="No Records Found" description="Add your first DeepL API Key record" />
      ) : (
        records.map((record, index) => {
          const used = record.usage.usedCharacters / record.usage.totalCharacters;
          return (
            <List.Item
              key={index}
              title={record.title}
              accessories={[
                { text: `used: ${record.usage.usedCharacters}` },
                { text: `total: ${record.usage.totalCharacters}` },
                {
                  text: {
                    value: `${getUsagePercentage(record.usage)}%`,
                    color: colorMapper(used),
                  },
                },
              ]}
              icon={getProgressIcon(used, colorMapper(used))}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Eye} title="View Details" target={<RecordDetail record={record} />} />
                  <Action.Push
                    title="Modify Record"
                    icon={Icon.Pencil}
                    target={
                      <EditRecordForm
                        record={record}
                        onConfirm={async (record) => {
                          const updatedRecords = records.map((r) => (r.id === record!.id ? record : r));
                          await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
                          showToast(Toast.Style.Success, "Record Modified");
                          loadRecords();
                        }}
                      />
                    }
                  />
                  {addRecordNode}
                  <Action
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    title="Delete Record"
                    onAction={async () => {
                      const flag = await confirmAlert({
                        title: "Delete Record",
                        icon: Icon.Trash,
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete",
                        },
                        message: "Confirm delete the record permanently?",
                      });
                      if (flag) {
                        handleDelete(record.id);
                      }
                    }}
                  />
                  {refreshNode}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function RecordDetail({ record }: { record: Record }) {
  const md = `
  ## ${record.title}
  ---
  **API Key:** \`You can copy this through action\`

  **Description:**
  \`\`\`
  ${(record.description || "").replace(/\n/g, "\n\n")}
  \`\`\`

  **Usage:** ${record.usage.usedCharacters} / ${record.usage.totalCharacters} (${getUsagePercentage(record.usage)}%)
`;
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy API Key" content={record.apiKey} />
          <Action.CopyToClipboard title="Copy Description" content={record.description} />
        </ActionPanel>
      }
      navigationTitle="Record Details"
      markdown={md}
    />
  );
}

function EditRecordForm({
  record,
  isNew = false,
  onConfirm,
}: {
  record?: Record;
  isNew?: boolean;
  onConfirm: (record: Record) => void;
}) {
  const { pop } = useNavigation();

  interface FormValues {
    title: string;
    description: string;
    apiKey: string;
  }

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      let usage: Usage;
      try {
        showToast(Toast.Style.Animated, "validating API Key...");
        usage = await fetchUsage(values.apiKey);
      } catch (err: any) {
        showToast(Toast.Style.Failure, "Invalid API Key", err);
        return;
      }

      const newRecord: Record = {
        id: isNew ? Date.now().toString() : record!.id,
        title: values.title,
        description: values.description,
        apiKey: values.apiKey,
        usage: usage!,
      };

      onConfirm(newRecord);
      pop();
    },
    validation: {
      title: (value) => {
        if (value && value.length > 20) {
          return "Max 20 characters";
        } else if (!value) {
          return "The field is required";
        }
      },
      apiKey: FormValidation.Required,
    },
  });

  if (record) {
    setValue("title", record.title);
    setValue("title", record.description);
    setValue("title", record.apiKey);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField placeholder="such as: Key1" {...itemProps.title} />
      <Form.TextArea
        info="You can store your account or password here, it's safe, but not necessary."
        {...itemProps.description}
      />
      <Form.PasswordField placeholder="DeepL Free API Key" info="Only support Free API Key now" {...itemProps.apiKey} />
    </Form>
  );
}

async function fetchUsage(apiKey: string): Promise<Usage> {
  const response = await fetch(`https://api-free.deepl.com/v2/usage`, {
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch usage");
  }

  const data = (await response.json()) as { character_count: number; character_limit: number };
  if (data?.character_count === undefined || data?.character_limit === undefined) {
    throw new Error("Invalid API Key");
  }
  return {
    usedCharacters: data.character_count,
    totalCharacters: data.character_limit,
  };
}

function getUsagePercentage(usage: Usage): string {
  const percentage = (usage.usedCharacters / usage.totalCharacters) * 100;
  return percentage.toFixed(2);
}
