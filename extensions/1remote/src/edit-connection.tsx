import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { Connection, duplicateConnection, updateConnection } from "./lib/one-remote";

interface EditFormValues {
  DisplayName: string;
  Address: string;
  Port: string;
  UserName: string;
  Domain: string;
  Tags: string;
  Note: string;
  ColorHex: string;
}

interface Props {
  connection: Connection;
  onSaved: () => void;
}

function parseTags(value: string) {
  return [
    ...new Set(
      value
        .split(/[,;]/)
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ];
}

export default function EditConnectionForm({ connection, onSaved }: Props) {
  const { pop } = useNavigation();
  const hasDomain = typeof connection.json.Domain === "string";

  const { handleSubmit, itemProps } = useForm<EditFormValues>({
    initialValues: {
      DisplayName: connection.name,
      Address: connection.address,
      Port: connection.port,
      UserName: connection.userName,
      Domain: (connection.json.Domain as string | undefined) ?? "",
      Tags: connection.tags.join(", "),
      Note: connection.note,
      ColorHex: connection.json.ColorHex ?? "",
    },
    validation: {
      DisplayName: FormValidation.Required,
      Port: (value) => (value && !/^\d{1,5}$/.test(value) ? "Port must be a number" : undefined),
      ColorHex: (value) =>
        value && !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) ? "Use #RRGGBB or #AARRGGBB" : undefined,
    },
    async onSubmit(values) {
      try {
        updateConnection(connection.id, {
          DisplayName: values.DisplayName.trim(),
          Address: values.Address.trim(),
          Port: values.Port.trim(),
          UserName: values.UserName.trim(),
          Domain: hasDomain ? values.Domain.trim() : undefined,
          Tags: parseTags(values.Tags),
          Note: values.Note,
          ColorHex: values.ColorHex.trim(),
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Connection saved",
          message: "1Remote picks it up within about 20 seconds",
        });
        onSaved();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Could not save connection" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Edit ${connection.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Connection" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Protocol" text={connection.protocol} />
      <Form.TextField title="Name" placeholder="Connection name" {...itemProps.DisplayName} />
      <Form.TextField title="Address" placeholder="Host name or IP address" {...itemProps.Address} />
      <Form.TextField title="Port" placeholder="3389" {...itemProps.Port} />
      <Form.TextField title="User Name" placeholder="User name" {...itemProps.UserName} />
      {hasDomain && <Form.TextField title="Domain" placeholder="Domain" {...itemProps.Domain} />}
      <Form.TextField title="Tags" placeholder="tag1, tag2" info="Comma-separated" {...itemProps.Tags} />
      <Form.TextArea title="Note" enableMarkdown {...itemProps.Note} />
      <Form.TextField title="Color" placeholder="#FF15C600" {...itemProps.ColorHex} />
      <Form.Description text="Passwords, credentials and protocol-specific settings are encrypted or complex — edit those in 1Remote." />
    </Form>
  );
}

export function DuplicateConnectionForm({ connection, onSaved }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ DisplayName: string }>({
    initialValues: { DisplayName: `${connection.name} (copy)` },
    validation: { DisplayName: FormValidation.Required },
    async onSubmit(values) {
      try {
        duplicateConnection(connection, values.DisplayName.trim());
        await showToast({ style: Toast.Style.Success, title: "Connection duplicated" });
        onSaved();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Could not duplicate connection" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Duplicate ${connection.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Duplicate Connection" icon={Icon.CopyClipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="New Name" placeholder="Connection name" {...itemProps.DisplayName} />
      <Form.Description text="All settings, including the saved password, are copied. Edit the copy afterwards to change the address." />
    </Form>
  );
}
