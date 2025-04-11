import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { createMaskedEmail } from "./fastmail";

type Preferences = {
  create_prefix: string;
};

type FormValues = {
  prefix: string;
  description: string;
};

export default function Command() {
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const { create_prefix } = getPreferenceValues<Preferences>();

  const handleSubmit = async ({ prefix, description }: FormValues) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });

    try {
      const email = await createMaskedEmail(prefix, description);

      Clipboard.copy(email);

      await showHUD(`🎉 Masked email copied to clipboard`);

      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create masked email";
      toast.message =
        error instanceof Error
          ? error.message
          : "An error occurred while creating the masked email, please try again later";
    }
  };

  const handleSubmitInteractive = async ({ prefix, description }: FormValues) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });

    try {
      const email = await createMaskedEmail(prefix, description);

      setMaskedEmail(email);

      Clipboard.copy(email);

      toast.style = Toast.Style.Success;
      toast.title = "Masked email copied to clipboard";
      toast.message = email;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create masked email";
      toast.message =
        error instanceof Error
          ? error.message
          : "An error occurred while creating the masked email, please try again later";
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Masked Email" icon={Icon.EyeDisabled} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Create Masked Email Interactively"
            icon={Icon.EyeDisabled}
            onSubmit={handleSubmitInteractive}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="prefix"
        title="Prefix (Optional)"
        placeholder="Prefix to use for this masked email"
        defaultValue={create_prefix}
        info={`If you have configured a default prefix in the preferences, it will be used here. If you leave this field empty, no prefix will be used.

A prefix must be <= 64 characters in length and only contain characters a-z, 0-9 and _ (underscore)`}
      />
      <Form.TextField
        id="description"
        title="Description (Optional)"
        placeholder="What is this masked email for?"
        autoFocus={true}
      />
      {maskedEmail && (
        <>
          <Form.Description text={`\n${maskedEmail}\n`} />
          <Form.Description
            text={`This masked email is currently in the pending state and will be automatically deleted after 24 hours if not used`}
          />
          <Form.Description text={`Use ⇧⌘⏎ to generate a new masked email`} />
        </>
      )}
    </Form>
  );
}
