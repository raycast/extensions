import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { ProfileDraft } from "../services/profile-store";
import { getErrorMessage } from "../services/error-utils";

const MIN_TIMEOUT_MS = 1000;

function validateRequiredField(value?: string): string | undefined {
  if (!value?.trim()) {
    return "This field is required.";
  }

  return undefined;
}

function validateTimeout(value?: string): string | undefined {
  if (!value?.trim()) {
    return "Timeout is required.";
  }

  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS) {
    return `Timeout must be a number >= ${MIN_TIMEOUT_MS}.`;
  }

  return undefined;
}

function validateCustomHeaders(value?: string): string | undefined {
  const headersText = value?.trim() ?? "";
  if (!headersText) {
    return undefined;
  }

  try {
    const parsedHeaders = JSON.parse(headersText) as unknown;
    if (
      !parsedHeaders ||
      Array.isArray(parsedHeaders) ||
      typeof parsedHeaders !== "object"
    ) {
      return "Custom headers JSON must be an object.";
    }
  } catch {
    return "Custom headers must be valid JSON.";
  }

  return undefined;
}

export function ProfileEditorForm(props: {
  title: string;
  initialDraft: ProfileDraft;
  onSubmit: (draft: ProfileDraft) => Promise<void>;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ProfileDraft>({
    initialValues: props.initialDraft,
    validation: {
      name: validateRequiredField,
      baseUrl: validateRequiredField,
      apiKey: validateRequiredField,
      model: validateRequiredField,
      timeoutMs: validateTimeout,
      customHeadersJson: validateCustomHeaders,
    },
    onSubmit: async (values) => {
      try {
        await props.onSubmit(values);
        await showToast({
          style: Toast.Style.Success,
          title: "Profile saved.",
        });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Save failed",
          message: getErrorMessage(error),
        });
      }
    },
  });

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Profile Name"
        placeholder="Personal OpenAI"
        {...itemProps.name}
      />
      <Form.TextField
        title="API Base URL"
        placeholder="https://api.openai.com/v1"
        {...itemProps.baseUrl}
      />
      <Form.PasswordField
        title="API Key"
        placeholder="sk-..."
        {...itemProps.apiKey}
      />
      <Form.TextField
        title="Model"
        placeholder="gpt-4.1-mini"
        {...itemProps.model}
      />
      <Form.TextField
        title="Request Timeout (ms)"
        placeholder="30000"
        {...itemProps.timeoutMs}
      />
      <Form.Checkbox
        title="Enable Streaming"
        label="Enabled"
        {...itemProps.enableStreaming}
      />
      <Form.TextArea
        title="Custom Headers JSON"
        placeholder='{"HTTP-Referer":"https://example.com"}'
        {...itemProps.customHeadersJson}
      />
      <Form.Checkbox
        title="Profile Enabled"
        label="Enabled"
        {...itemProps.enabled}
      />
    </Form>
  );
}
