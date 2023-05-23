import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { useBitwarden } from "~/context/bitwarden";
import { Preferences } from "~/types/preferences";
import { treatError } from "~/utils/debug";
import { captureException } from "~/utils/development";
import useVaultMessages from "~/utils/hooks/useVaultMessages";
import { getLabelForTimeoutPreference } from "~/utils/preferences";

export type UnlockFormProps = {
  lockReason?: string;
};

/** Form for unlocking or logging in to the Bitwarden vault. */
const UnlockForm = (props: UnlockFormProps) => {
  const { lockReason: lockReasonProp } = props;

  const bitwarden = useBitwarden();
  const [isLoading, setLoading] = useState(false);
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages();
  const lockReason = useRef(lockReasonProp ?? bitwarden.lockReason).current;
  const [unlockError, setUnlockError] = useState<string | undefined>(undefined);

  async function onSubmit({ password }: { password: string }) {
    if (password.length === 0) return;

    const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait");
    try {
      setLoading(true);
      setUnlockError(undefined);

      const state = await bitwarden.status();
      if (state.status === "unauthenticated") {
        try {
          await bitwarden.login();
        } catch (error) {
          const {
            displayableError = `Please check your ${shouldShowServer ? "Server URL, " : ""}API Key and Secret.`,
            treatedError,
          } = getUsefulError(error, password);
          await showToast(Toast.Style.Failure, "Failed to log in", displayableError);
          setUnlockError(treatedError);
          captureException("Failed to log in", error);
          return;
        }
      }

      await bitwarden.unlock(password);
      await toast.hide();
    } catch (error) {
      const { displayableError = "Please check your credentials", treatedError } = getUsefulError(error, password);
      await showToast(Toast.Style.Failure, "Failed to unlock vault", displayableError);
      setUnlockError(treatedError);
      captureException("Failed to unlock vault", error);
    } finally {
      setLoading(false);
    }
  }

  const copyUnlockError = async () => {
    if (!unlockError) return;
    await Clipboard.copy(unlockError);
    await showToast(Toast.Style.Success, "Error copied to clipboard");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action.SubmitForm
              icon={Icon.LockUnlocked}
              title="Unlock"
              onSubmit={onSubmit}
              shortcut={{ key: "enter", modifiers: [] }}
            />
          )}
          {!!unlockError && (
            <Action
              onAction={copyUnlockError}
              title="Copy Last Error"
              icon={Icon.Bug}
              style={Action.Style.Destructive}
            />
          )}
        </ActionPanel>
      }
    >
      {shouldShowServer && <Form.Description title="Server URL" text={serverMessage} />}
      <Form.Description title="Vault Status" text={userMessage} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
      {!!lockReason && (
        <>
          <Form.Description title="ℹ️" text={lockReason} />
          <TimeoutInfoDescription />
        </>
      )}
    </Form>
  );
};

function TimeoutInfoDescription() {
  const vaultTimeoutMs = getPreferenceValues<Preferences>().repromptIgnoreDuration;
  const timeoutLabel = getLabelForTimeoutPreference(vaultTimeoutMs);

  if (!timeoutLabel) return null;
  return (
    <Form.Description
      title=""
      text={`Timeout is set to ${timeoutLabel}, this can be configured in the extension settings`}
    />
  );
}

function getUsefulError(error: unknown, password: string) {
  const treatedError = treatError(error, { omitSensitiveValue: password });
  let displayableError: string | undefined;
  if (/Invalid master password/i.test(treatedError)) {
    displayableError = "Invalid master password";
  } else if (/Invalid API Key/i.test(treatedError)) {
    displayableError = "Invalid Client ID or Secret";
  }
  return { displayableError, treatedError };
}

export default UnlockForm;
