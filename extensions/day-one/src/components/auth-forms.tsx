import { useRef } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { login, setEncryptionKey } from "../lib/api";
import { failToast, syncWithToast } from "../lib/feedback";

const KEY_HELP = "In the Day One app on any device you already use, open Journals and choose Show Encryption Key.";

// Neither form enables drafts or `storeValue`: a password or key typed here must never be written to disk by Raycast.
// The values go to the CLI on stdin, and the CLI keeps a session token, not the password.

export function SignInForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  const busy = useRef(false);
  const { handleSubmit, itemProps } = useForm<{ email: string; password: string; key?: string }>({
    validation: { email: FormValidation.Required, password: FormValidation.Required },
    async onSubmit({ email, password, key }) {
      if (busy.current) return;
      busy.current = true;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Signing In…" });
      let failure = "Couldn't Sign In";
      try {
        await login(email.trim(), password);
        if (key?.trim()) {
          failure = "Signed In, but the Key Wasn't Saved";
          toast.title = "Saving Encryption Key…";
          await setEncryptionKey(key.trim());
        }
        // No hide(): the sync toast below replaces this one, and hide() would act on whatever toast is showing.
        pop();
        onDone();
        // The first sync downloads every journal; it starts right away so setup ends with real data.
        await syncWithToast({ title: "Downloading Your Journals…" });
        onDone();
      } catch (error) {
        await failToast(error, failure, toast);
      } finally {
        busy.current = false;
      }
    },
  });

  return (
    <Form
      navigationTitle="Sign In to Day One"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign in" icon={Icon.Person} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="On Day One's free plan, only one device syncs. The CLI counts as a device, so signing in here can stop sync on your phone." />
      <Form.TextField title="Email" placeholder="you@example.com" autoFocus {...itemProps.email} />
      <Form.PasswordField
        title="Password"
        info="If you sign in to Day One with Apple or Google, you may need to set a password in Day One first."
        {...itemProps.password}
      />
      <Form.Separator />
      <Form.PasswordField title="Encryption Key" placeholder="Optional" info={KEY_HELP} {...itemProps.key} />
      <Form.Description text="The Day One CLI keeps the key in your system keychain. You can add it later in Run Doctor." />
    </Form>
  );
}

export function EncryptionKeyForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  const busy = useRef(false);
  const { handleSubmit, itemProps } = useForm<{ key: string }>({
    validation: { key: FormValidation.Required },
    async onSubmit({ key }) {
      if (busy.current) return;
      busy.current = true;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Encryption Key…" });
      try {
        await setEncryptionKey(key.trim());
        pop();
        // Saving a key resets the CLI's sync cursors; a sync re-downloads and decrypts.
        await syncWithToast({ title: "Decrypting Your Journals…" });
        onDone();
      } catch (error) {
        await failToast(error, "Couldn't Save Encryption Key", toast);
      } finally {
        busy.current = false;
      }
    },
  });

  return (
    <Form
      navigationTitle="Add Encryption Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Key" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={KEY_HELP} />
      <Form.PasswordField title="Encryption Key" placeholder="Enter Your Encryption Key" autoFocus {...itemProps.key} />
      <Form.Description text="Saving the key re-downloads your journals so encrypted entries can be read." />
    </Form>
  );
}
