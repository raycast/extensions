import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { createAccount, updateAccount } from "../accounts/storage";
import { DokployAccount } from "../accounts/types";
import { DokployClient, isValidServerUrl, normalizeServerUrl } from "../api/client";
import { verifyCredentials } from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";

interface AccountFormValues {
  label: string;
  url: string;
  apiKey: string;
}

interface AccountFormProps {
  /** Omitted when adding a new account. */
  account?: DokployAccount;
  onSaved: () => void;
}

export function AccountForm({ account, onSaved }: AccountFormProps) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = account !== undefined;

  const { handleSubmit, itemProps } = useForm<AccountFormValues>({
    async onSubmit(values) {
      setIsSaving(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying credentials…" });

      const candidate: DokployAccount = {
        id: account?.id ?? "pending",
        label: values.label.trim(),
        url: normalizeServerUrl(values.url),
        apiKey: values.apiKey.trim(),
        createdAt: account?.createdAt ?? new Date().toISOString(),
      };

      // Prove the URL + key actually work before storing them, so a typo surfaces here
      // rather than as a confusing failure in every other command.
      try {
        await verifyCredentials(new DokployClient(candidate));
      } catch (error) {
        setIsSaving(false);
        toast.style = Toast.Style.Failure;
        toast.title = "Could Not Connect";
        toast.message = toErrorMessage(error);
        return;
      }

      try {
        if (isEditing) {
          await updateAccount(account.id, candidate);
        } else {
          await createAccount(candidate);
        }
      } catch (error) {
        setIsSaving(false);
        toast.style = Toast.Style.Failure;
        toast.title = "Could Not Save Account";
        toast.message = toErrorMessage(error);
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = isEditing ? "Account Updated" : "Account Added";
      toast.message = candidate.label;

      setIsSaving(false);
      onSaved();
      pop();
    },
    initialValues: {
      label: account?.label ?? "",
      url: account?.url ?? "",
      apiKey: account?.apiKey ?? "",
    },
    validation: {
      label: FormValidation.Required,
      apiKey: FormValidation.Required,
      url: (value) => {
        if (!value?.trim()) return "The server URL is required";
        if (!isValidServerUrl(value)) return "Enter a valid URL, e.g. https://dokploy.example.com";
        return undefined;
      },
    },
  });

  return (
    <Form
      isLoading={isSaving}
      navigationTitle={isEditing ? `Edit ${account.label}` : "Add Dokploy Account"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Account" : "Add Account"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="Production"
        info="A label to tell this instance apart from your others."
        {...itemProps.label}
      />
      <Form.TextField
        title="Server URL"
        placeholder="https://dokploy.example.com"
        info="The address of your Dokploy dashboard. The /api suffix is added automatically."
        {...itemProps.url}
      />
      <Form.PasswordField
        title="API Key"
        placeholder="dokploy_…"
        info="Generate one in Dokploy under Settings → Profile → API/CLI."
        {...itemProps.apiKey}
      />
      <Form.Description
        title="Where do I find the key?"
        text={
          "In your Dokploy dashboard open Settings → Profile → API/CLI and generate a key.\nThe key is stored in Raycast's encrypted local storage."
        }
      />
    </Form>
  );
}
