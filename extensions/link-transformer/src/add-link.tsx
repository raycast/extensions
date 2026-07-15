import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { readData, processAliases, addLink, updateLink } from "./utils";

interface FormData {
  url: string;
  aliases: string;
}

interface FormLinkProps {
  onUpdate: (values: FormData) => Promise<boolean>;
  initialValues?: Partial<FormData>;
  submitTitle: string;
  submitIcon?: Icon;
}

function FormLink({ onUpdate, initialValues, submitTitle, submitIcon }: FormLinkProps) {
  const { handleSubmit, itemProps, reset } = useForm<FormData>({
    initialValues: {
      url: "",
      aliases: "",
      ...initialValues,
    },
    onSubmit: async (values) => {
      const success = await onUpdate(values);
      if (success) {
        reset();
      }
    },
    validation: {
      url: (value: string | undefined) => {
        if (value === undefined) return "URL is required";
        try {
          new URL(value);
        } catch {
          return "Invalid URL";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={submitIcon} title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="URL" placeholder="https://example.com" />
      <Form.TextField {...itemProps.aliases} title="Aliases" placeholder="alias1, alias2" />
    </Form>
  );
}

export default function AddLink({ afterUpdate }: { afterUpdate?: () => void }) {
  const handleUpdate = async (values: FormData) => {
    const aliases = processAliases(values.aliases);
    addLink(values.url, aliases);
    await showToast({ style: Toast.Style.Success, title: "Link added successfully" });
    afterUpdate?.();
    return true;
  };

  return <FormLink onUpdate={handleUpdate} submitTitle="Add Link" submitIcon={Icon.Plus} />;
}

export function EditLink({ id, afterUpdate }: { id: string; afterUpdate?: () => void }) {
  const data = readData();
  const link = data.links.find((l) => l.id === id);

  if (!link) {
    return <Detail markdown="Link not found" />;
  }

  const handleUpdate = async (values: FormData) => {
    const aliases = processAliases(values.aliases);
    updateLink(id, values.url, aliases);
    await showToast({ style: Toast.Style.Success, title: "Link updated successfully" });
    afterUpdate?.();
    return true;
  };

  return (
    <FormLink
      onUpdate={handleUpdate}
      initialValues={{
        url: link.url,
        aliases: link.aliases.join(", "),
      }}
      submitTitle="Update Link"
      submitIcon={Icon.Pencil}
    />
  );
}
