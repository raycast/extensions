import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { DebuggingBugReportingActionSection } from "~/components/actions";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { treatError } from "~/utils/debug";
import { captureException } from "~/utils/development";
import useVaultMessages from "~/utils/hooks/useVaultMessages";
import { useLocalStorageItem } from "~/utils/localstorage";
import { platform } from "~/utils/platform";
import { getLabelForTimeoutPreference } from "~/utils/preferences";

type UnlockFormProps = {
  pendingAction?: Promise<void>;
};

/** Form for unlocking or logging in to the Bitwarden vault. */
const UnlockForm = ({ pendingAction = Promise.resolve() }: UnlockFormProps) => {
  const bitwarden = useBitwarden();
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages();

  const [isLoading, setLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string>();
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
          const { error: loginError } = await bitwarden.login();
          if (loginError) throw loginError;
        } catch (error) {
          return handleUnlockError(error, {
            title: "Failed to log in",
            fallbackMessage: `Please check your ${shouldShowServer ? "Server URL, " : ""}API Key and Secret.`,
          });
        }
      }

      const { error: unlockError } = await bitwarden.unlock(password);
      if (unlockError) {
        return handleUnlockError(unlockError, {
          title: "Failed to unlock vault",
          fallbackMessage: "Please check your credentials",
        });
      }

      await clearLockReason();
      await toast.hide();
    } catch (error) {
      await handleUnlockError(error, {
        title: "Failed to unlock vault",
        fallbackMessage: "Please check your credentials",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockError(error: unknown, toastOptions: { title: string; fallbackMessage: string }) {
    const { title, fallbackMessage } = toastOptions;

    const { displayableError = fallbackMessage, treatedError } = getUsefulError(error, password);
    setUnlockError(treatedError);

    await showToast({
      title,
      message: displayableError,
      style: Toast.Style.Failure,
      primaryAction: { title: "Copy Error", onAction: copyUnlockError },
    });
    captureException("Failed to unlock vault", error);
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
              <Action.SubmitForm icon={Icon.LockUnlocked} title="Unlock" onSubmit={onSubmit} />
              <Action
                icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
                title={showPassword ? "Hide Password" : "Show Password"}
                onAction={() => setShowPassword((prev) => !prev)}
                shortcut={{ macOS: { key: "e", modifiers: ["opt"] }, Windows: { key: "e", modifiers: ["alt"] } }}
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
          <DebuggingBugReportingActionSection />
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
      <Form.Description
        title=""
        text={`Press ${platform === "macos" ? "⌥" : "Alt"}+E to ${showPassword ? "hide" : "show"} password`}
      />
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
  const vaultTimeoutMs = getPreferenceValues<AllPreferences>().repromptIgnoreDuration;
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
