import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import type { UploadOptions } from "../api/interfaces";

type UploadFormProps = {
  initialValues?: Partial<UploadOptions>;
  onSubmit: (values: UploadFormValues) => Promise<void>;
};

type UploadFormValues = UploadOptions & { filePath: string | string[] };

export function UploadForm({ initialValues, onSubmit }: UploadFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: UploadFormValues) => {
    setIsLoading(true);
    try {
      await onSubmit({
        ...values,
        filePath: Array.isArray(values.filePath) ? values.filePath[0] : values.filePath,
        serverCompress: Boolean(values.serverCompress),
        autoRetry: Boolean(values.autoRetry),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload Image"
            onSubmit={(values) => void handleSubmit(values as UploadFormValues)}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="filePath"
        title="Image File"
        allowMultipleSelection={false}
        defaultValue={initialValues?.filePath ? [initialValues.filePath] : []}
      />
      <Form.TextField id="fileName" title="Custom File Name" defaultValue={initialValues?.fileName} />
      <Form.TextField
        id="channel"
        title="Upload Channel"
        placeholder="telegram"
        defaultValue={initialValues?.channel}
      />
      <Form.TextField id="folder" title="Upload Folder" defaultValue={initialValues?.folder} />
      <Form.Dropdown id="nameType" title="Naming Strategy" defaultValue={initialValues?.nameType ?? "default"}>
        <Form.Dropdown.Item value="default" title="Default (prefix + original name)" />
        <Form.Dropdown.Item value="index" title="Prefix only" />
        <Form.Dropdown.Item value="origin" title="Original file name" />
        <Form.Dropdown.Item value="short" title="Short link" />
      </Form.Dropdown>
      <Form.Dropdown id="returnFormat" title="Return Format" defaultValue={initialValues?.returnFormat ?? "default"}>
        <Form.Dropdown.Item value="default" title="Default /file/xxx" />
        <Form.Dropdown.Item value="full" title="Full URL" />
      </Form.Dropdown>
      <Form.Checkbox
        id="serverCompress"
        label="Server-side compression (Telegram channel)"
        defaultValue={initialValues?.serverCompress ?? true}
      />
      <Form.Checkbox
        id="autoRetry"
        label="Auto retry via another channel"
        defaultValue={initialValues?.autoRetry ?? true}
      />
    </Form>
  );
}
