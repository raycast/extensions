import { Action, ActionPanel, Form } from "@raycast/api";
import { CodeLanguage } from "@daytona/sdk";
import { setSandboxCreatedToast, setToastFailure, startDaytonaAnimatedToast } from "./daytona-toast";

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
    const { preferences, daytona, toast } = await startDaytonaAnimatedToast("Creating sandbox");

    try {
      const sandbox = await daytona.create({
        name: values.name.trim() || undefined,
        language: values.language,
        snapshot: values.snapshot?.trim() || undefined,
        public: parseOptionalBoolean(values.publicPreview),
        ephemeral: parseOptionalBoolean(values.ephemeral),
      });

      setSandboxCreatedToast(toast, preferences, sandbox);
    } catch (error) {
      setToastFailure(toast, "Failed to create sandbox", error);
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
