import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ApiKeyData } from "./types/types";

interface apiKeyFormValues {
  name: string;
  disabled?: boolean;
  limit?: string;
  limit_reset?: string;
  include_byok_in_limit: boolean;
}

export default function Command(props: LaunchProps<{ arguments: { hash: string } }>) {
  const { hash } = props.arguments;

  const [error, setError] = useState<Error>();
  const [found, setFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyValues, setApiKeyValues] = useState<apiKeyFormValues>();

  const preferences = getPreferenceValues<Preferences>();

  async function loadApiKeyData() {
    setIsLoading(true);
    await fetch(`https://openrouter.ai/api/v1/keys/${hash}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.management_key}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json() as Promise<{ data: ApiKeyData }>;
      })
      .then((apiKeyData) => {
        setApiKeyValues({
          name: apiKeyData.data.name,
          limit: apiKeyData.data.limit != null ? String(apiKeyData.data.limit) : undefined,
          limit_reset: apiKeyData.data.limit_reset ?? undefined,
          include_byok_in_limit: apiKeyData.data.include_byok_in_limit,
          disabled: apiKeyData.data.disabled,
        });
        setFound(true);
        setIsLoading(false);
      })
      .catch((error) => {
        setError(error instanceof Error ? error : new Error(String(error)));
        setFound(false);
        setIsLoading(false);
      });
  }

  async function editApiKey(body: Record<string, unknown>) {
    await fetch(`https://openrouter.ai/api/v1/keys/${hash}`, {
      method: "PATCH",
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
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "API Key modified successfully!",
        });
      })
      .catch((error) => {
        setError(error instanceof Error ? error : new Error(String(error)));
      });
  }

  useEffect(() => {
    loadApiKeyData();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const { handleSubmit, itemProps } = useForm<apiKeyFormValues>({
    onSubmit(values) {
      const payload: Record<string, unknown> = {
        name: values.name,
        limit: values.limit ? Number(values.limit) : null,
        limit_reset: values.limit_reset ? values.limit_reset : null,
        disabled: values.disabled,
        include_byok_in_limit: values.include_byok_in_limit,
      };
      editApiKey(payload);
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
    <>
      {found ? (
        <Form
          isLoading={isLoading}
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
            defaultValue={apiKeyValues?.name}
            {...itemProps.name}
          />
          <Form.TextField title="Limit" defaultValue={apiKeyValues?.limit} {...itemProps.limit} />
          <Form.Dropdown title="Limit Reset" defaultValue={apiKeyValues?.limit_reset} {...itemProps.limit_reset}>
            <Form.Dropdown.Item value="" title="None" />
            <Form.Dropdown.Item value="daily" title="Daily" />
            <Form.Dropdown.Item value="weekly" title="Weekly" />
            <Form.Dropdown.Item value="monthly" title="Monthly" />
          </Form.Dropdown>
          <Form.Checkbox label="" title="Disabled" defaultValue={apiKeyValues?.disabled} {...itemProps.disabled} />
          <Form.Checkbox
            label=""
            title="Include BYOK"
            defaultValue={apiKeyValues?.include_byok_in_limit}
            {...itemProps.include_byok_in_limit}
          />
        </Form>
      ) : (
        <List isLoading={isLoading}>
          <List.EmptyView icon={Icon.QuestionMark} title="No API Key found with that hash value" />
        </List>
      )}
    </>
  );
}
