import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

interface createApiKeyFormValues {
  name: string;
  limit?: string;
  limit_reset?: string;
  include_byok_in_limit?: boolean;
  expires_at?: Date | null;
}

export default function Command(props: LaunchProps<{ draftValues: createApiKeyFormValues }>) {
  const { draftValues } = props;

  const [error, setError] = useState<Error>();

  const preferences = getPreferenceValues<Preferences>();

  async function createAndCopyApiKey(body: Record<string, unknown>) {
    let success;
    await fetch("https://openrouter.ai/api/v1/keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.management_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json() as Promise<{ key: string }>;
      })
      .then((data) => {
        Clipboard.copy(data.key);
      })
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "API Key created successfully!",
          message: "The key has automatically been copied to your clipboard.",
        });
        success = true;
      })
      .catch((error) => {
        setError(error instanceof Error ? error : new Error(String(error)));
        success = false;
      });

    return success;
  }

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const { handleSubmit, itemProps, reset } = useForm<createApiKeyFormValues>({
    async onSubmit(values) {
      const payload: Record<string, unknown> = { name: values.name };
      if (values.limit) payload.limit = Number(values.limit);
      if (values.limit_reset) payload.limit_reset = values.limit_reset;
      if (values.expires_at) payload.expires_at = values.expires_at.toISOString();
      if (values.include_byok_in_limit) payload.include_byok_in_limit = values.include_byok_in_limit;
      const success = await createAndCopyApiKey(payload);
      if (success) reset();
    },
    validation: {
      name: FormValidation.Required,
      limit: (value) => {
        if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
          return "Limit must be a positive number";
        }
      },
    },
  });
  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="My API Key"
        autoFocus
        defaultValue={draftValues?.name}
        {...itemProps.name}
      />
      <Form.TextField title="Limit" defaultValue={draftValues?.limit} {...itemProps.limit} />
      <Form.Dropdown title="Limit Reset" defaultValue={draftValues?.limit_reset} {...itemProps.limit_reset}>
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
      </Form.Dropdown>
      <Form.DatePicker
        title="Expiration"
        min={new Date()}
        defaultValue={draftValues?.expires_at}
        {...itemProps.expires_at}
      />
      <Form.Checkbox
        label=""
        title="Include BYOK"
        defaultValue={draftValues?.include_byok_in_limit}
        {...itemProps.include_byok_in_limit}
      />
    </Form>
  );
}
