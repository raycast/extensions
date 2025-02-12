import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { treatError } from "~/utils/debug";
import { captureException } from "~/utils/development";
import useVaultMessages from "~/utils/hooks/useVaultMessages";
import { useLocalStorageItem } from "~/utils/localstorage";
import { getLabelForTimeoutPreference } from "~/utils/preferences";
import { Preferences } from "~/types/preferences";

type UnlockFormProps = {
  pendingAction?: Promise<void>;
};

/** Form for unlocking or logging in to the Bitwarden vault. */
const UnlockForm = ({ pendingAction = Promise.resolve() }: UnlockFormProps) => {
  const bitwarden = useBitwarden();
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages();

  const [isLoading, setLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [lockReason, { remove: clearLockReason }] = useLocalStorageItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON);

  async function onSubmit() {
    if (password.length === 0) return;

    const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait");
    try {
      setLoading(true);
      setUnlockError(undefined);

      await pendingAction;

      const { error, result: vaultState } = await bitwarden.status();
      if (error) throw error;

      if (vaultState.status === "unauthenticated") {
        try {
          const { error } = await bitwarden.login();
          if (error) throw error;
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
      await clearLockReason();
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

  let PasswordField = Form.PasswordField;
  let passwordFieldId = "password";
  if (showPassword) {
    PasswordField = Form.TextField;
    passwordFieldId = "plainPassword";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoading && (
            <>
              <Action.SubmitForm
                icon={Icon.LockUnlocked}
                title="Unlock"
                onSubmit={onSubmit}
                shortcut={{ key: "enter", modifiers: [] }}
              />
              <Action
                icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
                title={showPassword ? "Hide Password" : "Show Password"}
                onAction={() => setShowPassword((prev) => !prev)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            </>
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
      <PasswordField
        id={passwordFieldId}
        title="Master Password"
        value={password}
        onChange={setPassword}
        ref={(field) => field?.focus()}
      />
      <Form.Description title="" text={`Press ⌘E to ${showPassword ? "hide" : "show"} password`} />
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
