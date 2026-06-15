import { Action, ActionPanel, Form, showToast, Toast, Clipboard, showHUD, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getAliasOptions, getMailboxes, createCustomAlias, AliasOptions, Mailbox, SimpleLoginError } from "./api";

interface FormValues {
  alias_prefix: string;
  signed_suffix: string;
  mailbox_ids: string[];
  note: string;
  name: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [aliasOptions, setAliasOptions] = useState<AliasOptions | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating alias...",
      });

      try {
        const alias = await createCustomAlias({
          alias_prefix: values.alias_prefix,
          signed_suffix: values.signed_suffix,
          mailbox_ids: values.mailbox_ids.map((id) => parseInt(id, 10)),
          note: values.note || undefined,
          name: values.name || undefined,
        });

        await Clipboard.copy(alias.email);
        await toast.hide();
        await showHUD(`Copied ${alias.email}`);
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create alias";
        toast.message = error instanceof SimpleLoginError ? error.message : "Unknown error";
      }
    },
    validation: {
      alias_prefix: (value) => {
        if (!value) {
          return "Alias prefix is required";
        }
        if (!/^[a-z0-9._-]+$/.test(value)) {
          return "Only lowercase letters, numbers, dots, dashes and underscores are allowed";
        }
      },
      signed_suffix: FormValidation.Required,
      mailbox_ids: (value) => {
        if (!value || value.length === 0) {
          return "Select at least one mailbox";
        }
      },
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [options, mboxes] = await Promise.all([getAliasOptions(), getMailboxes()]);
        setAliasOptions(options);
        setMailboxes(mboxes.filter((m) => m.verified));

        const defaultMailbox = mboxes.find((m) => m.default && m.verified);
        if (defaultMailbox && options.suffixes.length > 0) {
          reset({
            alias_prefix: options.prefix_suggestion,
            signed_suffix: options.suffixes[0].signed_suffix,
            mailbox_ids: [defaultMailbox.id.toString()],
            note: "",
            name: "",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load options",
          message: error instanceof SimpleLoginError ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const canCreate = aliasOptions?.can_create ?? true;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {canCreate ? (
            <Action.SubmitForm title="Create Alias" onSubmit={handleSubmit} />
          ) : (
            <Action.OpenInBrowser title="Upgrade Plan" url="https://app.simplelogin.io/dashboard/pricing" />
          )}
        </ActionPanel>
      }
    >
      {!canCreate && <Form.Description text="You have reached your alias limit. Upgrade to create more aliases." />}

      <Form.TextField title="Alias Prefix" placeholder="Enter alias prefix" {...itemProps.alias_prefix} />

      <Form.Dropdown title="Suffix" {...itemProps.signed_suffix}>
        {aliasOptions?.suffixes.map((suffix) => (
          <Form.Dropdown.Item key={suffix.signed_suffix} value={suffix.signed_suffix} title={suffix.suffix} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker title="Mailboxes" {...itemProps.mailbox_ids}>
        {mailboxes.map((mailbox) => (
          <Form.TagPicker.Item key={mailbox.id} value={mailbox.id.toString()} title={mailbox.email} />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.TextField title="Display Name" placeholder="Optional display name" {...itemProps.name} />

      <Form.TextArea title="Note" placeholder="Optional note for this alias" {...itemProps.note} />
    </Form>
  );
}
