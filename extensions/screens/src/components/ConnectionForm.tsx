import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { ConnectTarget } from "../connect";
import { TYPE_ICONS, TYPE_SECTIONS, sectionTitle, typeForSection } from "../connection-type";
import { SavedConnection } from "../library";
import { connectableUrl, requiredText } from "./validation";

/**
 * Every dropdown reports a plain string, so the fields they back are typed as one and narrowed on
 * submit rather than carrying a union the form itself cannot honour.
 */
type FormValues = {
  name: string;
  section: string;
  protocol: string;
  kind: string;
  identifier: string;
  url: string;
};

/**
 * Adds a connection or edits one. Screens' library is where most of these come from, but it can't
 * distinguish two connections sharing a name, and a hostname it recorded may not be the one that
 * answers, so what a row opens stays editable without touching Screens.
 */
export default function ConnectionForm({
  connection,
  isNew = false,
  onSave,
}: {
  connection: SavedConnection;
  isNew?: boolean;
  onSave: (connection: SavedConnection) => Promise<void>;
}) {
  const { pop } = useNavigation();

  const form: ReturnType<typeof useForm<FormValues>> = useForm<FormValues>({
    initialValues: {
      name: connection.name,
      section: sectionTitle(connection.type),
      protocol: connection.clientProtocol,
      kind: connection.target.kind,
      identifier: connection.target.kind === "saved" ? connection.target.identifier : "",
      url: connection.target.kind === "direct" ? connection.target.url : "",
    },
    // Only the field the chosen kind actually shows is required. The other one is unmounted, so
    // holding it against the user would block a form they cannot see the error on.
    validation: {
      name: requiredText,
      identifier: (value) => (form.values.kind === "saved" ? requiredText(value) : undefined),
      url: (value) => (form.values.kind === "direct" ? connectableUrl(value) : undefined),
    },
    async onSubmit(submitted) {
      await onSave({
        id: connection.id,
        name: submitted.name.trim(),
        type: typeForSection(submitted.section, connection.type),
        clientProtocol: submitted.protocol === "rdp" ? "rdp" : "vnc",
        target:
          submitted.kind === "saved"
            ? savedTarget(submitted.identifier.trim())
            : { kind: "direct", url: submitted.url.trim() },
      });
      pop();
    },
  });

  const { handleSubmit, itemProps, values } = form;

  /**
   * Whether an identifier is ambiguous depends on Screens' whole library, which this form cannot
   * see. An identifier left as it was keeps the answer the import worked out for it. A new one is
   * the user's own choice of what Screens should match, so it carries no warning.
   */
  function savedTarget(identifier: string): ConnectTarget {
    const previous = connection.target;
    const ambiguous = previous.kind === "saved" && previous.identifier === identifier && previous.ambiguous;
    return { kind: "saved", identifier, ambiguous };
  }

  return (
    <Form
      navigationTitle={isNew ? "Add Connection" : `Edit ${connection.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isNew ? "Add Connection" : "Save"} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Shown in Raycast" {...itemProps.name} />
      <Form.Dropdown title="Type" {...itemProps.section}>
        {TYPE_SECTIONS.map((section) => (
          <Form.Dropdown.Item
            key={section.title}
            value={section.title}
            title={section.title}
            icon={TYPE_ICONS[section.types[0]]}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Protocol" {...itemProps.protocol}>
        <Form.Dropdown.Item value="vnc" title="VNC" icon={Icon.Monitor} />
        <Form.Dropdown.Item value="rdp" title="RDP" icon={Icon.Window} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown title="Connect Via" {...itemProps.kind}>
        <Form.Dropdown.Item value="saved" title="Saved Connection" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="direct" title="Direct Address" icon={Icon.Globe} />
      </Form.Dropdown>
      {values.kind === "saved" ? (
        <Form.TextField
          title="Name or Hostname"
          placeholder="What Screens should match"
          info="Screens looks this up in its own library, so the connection keeps its stored settings and credentials. It has to match exactly one connection there."
          {...itemProps.identifier}
        />
      ) : (
        <Form.TextField
          title="Address"
          placeholder="vnc://host or ssh://host"
          info="Connects straight to this address, bypassing the connection saved in Screens and the credentials stored with it."
          {...itemProps.url}
        />
      )}
    </Form>
  );
}
