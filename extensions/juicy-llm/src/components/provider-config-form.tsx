import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { saveProviderConfig } from "../storage";
import type { ProviderConfig } from "../types";
import { PROVIDER_LABELS } from "../types";

interface FormValues {
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
}

interface ProviderConfigFormProps {
  config: ProviderConfig;
  onSave: () => void;
}

export function ProviderConfigForm({
  config,
  onSave,
}: ProviderConfigFormProps) {
  const { pop } = useNavigation();
  const label = PROVIDER_LABELS[config.provider];
  const showApiKey = config.provider !== "ollama";
  const showBaseUrl =
    config.provider === "ollama" || config.provider === "openrouter";

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      await saveProviderConfig({
        provider: config.provider,
        apiKey: showApiKey ? values.apiKey || undefined : undefined,
        baseUrl: values.baseUrl || undefined,
        enabled: values.enabled,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `${label} settings saved`,
      });
      onSave();
      pop();
    },
    initialValues: {
      apiKey: config.apiKey ?? "",
      baseUrl: config.baseUrl ?? "",
      enabled: config.enabled,
    },
  });

  return (
    <Form
      navigationTitle={`${label} Settings`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {showApiKey && (
        <Form.PasswordField
          title="API Key"
          placeholder="sk-..."
          {...itemProps.apiKey}
        />
      )}
      {showBaseUrl && (
        <Form.TextField
          title="Base URL"
          placeholder={
            config.provider === "ollama"
              ? "http://localhost:11434/api"
              : "https://openrouter.ai/api/v1"
          }
          {...itemProps.baseUrl}
        />
      )}
      <Form.Checkbox label="Enabled" {...itemProps.enabled} />
    </Form>
  );
}
