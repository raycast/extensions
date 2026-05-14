import { Action, ActionPanel, Form, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { CodeLanguage, Daytona, DaytonaError } from "@daytona/sdk";

type Preferences = {
  apiKey: string;
  apiUrl?: string;
  target?: string;
};

type FormValues = {
  name: string;
  language: string;
  snapshot?: string;
  publicPreview?: string;
  ephemeral?: string;
};

export default function CreateSandboxCommand() {
  function parseOptionalBoolean(value: string | undefined): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  async function handleSubmit(values: FormValues) {
    const preferences = getPreferenceValues<Preferences>();

    const target = preferences.target && preferences.target !== "auto" ? preferences.target : undefined;
    const apiUrl = preferences.apiUrl?.trim() || undefined;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating sandbox",
    });

    try {
      const daytona = new Daytona({
        apiKey: preferences.apiKey,
        apiUrl,
        target,
      });

      const sandbox = await daytona.create({
        name: values.name.trim() || undefined,
        language: values.language,
        snapshot: values.snapshot?.trim() || undefined,
        public: parseOptionalBoolean(values.publicPreview),
        ephemeral: parseOptionalBoolean(values.ephemeral),
      });

      toast.style = Toast.Style.Success;
      toast.title = "Sandbox created";
      toast.message = `${sandbox.name} (${sandbox.id})`;
      toast.primaryAction = {
        title: "Open in Dashboard",
        onAction: () => open(`https://app.daytona.io/dashboard/sandboxes?sandboxId=${sandbox.id}`),
      };
    } catch (error) {
      const message = error instanceof DaytonaError || error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create sandbox";
      toast.message = message;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Sandbox" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My awesome sandbox" />
      <Form.Dropdown id="language" title="Language" defaultValue={CodeLanguage.PYTHON}>
        <Form.Dropdown.Item title="Python" value={CodeLanguage.PYTHON} />
        <Form.Dropdown.Item title="TypeScript" value={CodeLanguage.TYPESCRIPT} />
        <Form.Dropdown.Item title="JavaScript" value={CodeLanguage.JAVASCRIPT} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="snapshot" title="Snapshot" placeholder="Snapshot name" />
      <Form.Dropdown id="publicPreview" title="Public Preview Access" defaultValue="false">
        <Form.Dropdown.Item title="Enabled" value="true" />
        <Form.Dropdown.Item title="Disabled" value="false" />
      </Form.Dropdown>
      <Form.Dropdown id="ephemeral" title="Ephemeral Sandbox" defaultValue="false">
        <Form.Dropdown.Item title="Enabled" value="true" />
        <Form.Dropdown.Item title="Disabled" value="false" />
      </Form.Dropdown>
    </Form>
  );
}
