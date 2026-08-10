import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { Record, Usage, FormValues } from "../types";
import { useForm } from "@raycast/utils";
import { fetchUsage, getRecordsFromStorage } from "../util";

export default function EditRecordForm({
  record,
  isNew = false,
  onConfirm,
}: {
  record?: Record;
  isNew?: boolean;
  onConfirm: (record: Record) => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      let usage: Usage;
      try {
        showToast(Toast.Style.Animated, "validating API Key...");
        usage = await fetchUsage(values.apiKey);
      } catch (err: any) {
        showToast(Toast.Style.Failure, "Invalid API Key", err.message);
        return;
      }

      const storedRecords = await getRecordsFromStorage();
      const id = isNew ? Date.now().toString() : record!.id;

      if (storedRecords.filter((record) => record.id !== id).some((record) => record.apiKey === values.apiKey)) {
        showToast(Toast.Style.Failure, "API Key Already Exist");
        return;
      }

      const newRecord: Record = {
        id,
        title: values.title,
        description: values.description,
        apiKey: values.apiKey,
        usage: usage!,
        inUse: isNew ? false : record!.inUse,
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
      apiKey: (value) => {
        if (!value) {
          return "The field is required";
        }
      },
    },
  });

  useEffect(() => {
    if (record) {
      setValue("title", record.title);
      setValue("description", record.description);
      setValue("apiKey", record.apiKey);
    }
  }, [record]);

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
