import { Form, ActionPanel, Action, showToast, showHUD, popToRoot, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { saveSoundrawConfig } from "./lib/storage";
import { getAvailableGenres } from "./lib/soundraw";

type Values = {
  token: string;
  apiBaseUrl: string;
};

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: async (values) => {
      const { token, apiBaseUrl } = values;

      if (!token || token.trim().length === 0) {
        await showToast({
          title: "Error",
          message: "Please enter a valid Soundraw API token",
          style: Toast.Style.Failure,
        });
        return;
      }

      if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
        await showToast({
          title: "Error",
          message: "Please enter a valid API base URL",
          style: Toast.Style.Failure,
        });
        return;
      }

      try {
        // First save the configuration
        await saveSoundrawConfig(token.trim(), apiBaseUrl.trim());

        // Then validate by making a test call to /tags
        await showToast({
          title: "Validating Configuration",
          message: "Testing API connection...",
          style: Toast.Style.Animated,
        });

        await getAvailableGenres();

        await showHUD("Soundraw configuration saved and validated successfully!");
        await popToRoot();
      } catch (error) {
        console.error("Configuration validation failed:", error);
        await showToast({
          title: "Validation Failed",
          message:
            error instanceof Error
              ? error.message
              : "Failed to validate configuration. Please check your token and API URL.",
          style: Toast.Style.Failure,
        });
      }
    },
    validation: {
      token: (value) => {
        if (!value) return "The item is required";

        // UUID v4 validation regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value.trim())) {
          return "Please enter a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)";
        }
      },
      apiBaseUrl: (value) => {
        if (!value) return "The item is required";

        // Basic URL validation
        try {
          new URL(value.trim());
        } catch {
          return "Please enter a valid URL (e.g., https://api.example.com/api/internal/v4)";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        title="API Token"
        placeholder="8bf36ea4-6e85-4c46-814a-eb9c5676b03d"
        info="Your API token must be in UUID format"
        {...itemProps.token}
      />

      <Form.TextField
        title="API Base URL"
        placeholder="https://api.example.com/api/v1"
        info="The base URL for your endpoint"
        {...itemProps.apiBaseUrl}
      />
    </Form>
  );
}
