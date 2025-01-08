import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useState, useCallback, useRef } from "react";
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
  const inputRef = useRef<Form.TextField>(null);
  const maskChar = "•";

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handlePasswordChange = useCallback(
    (newValue: string) => {
      if (!newValue.includes(maskChar)) {
        setPassword(newValue);
        return;
      }

      // DELETE: If the length decreased, it's a deletion
      if (newValue.length < password.length) {
        setPassword((prev) => prev.slice(0, newValue.length));
        return;
      }

      // If last character is a maskedChar, then something changed in the middle of the password
      const middleChange = newValue[newValue.length - 1] === maskChar;

      // ADD: If the length increased, it's an addition
      if (newValue.length > password.length) {
        // It can be at the end or in the middle
        if (middleChange) {
          const indexOfAddedChar = nonMaskedPosition(newValue);
          const newPassword = insertCharAtPosition(password, newValue[indexOfAddedChar]!, indexOfAddedChar);
          setPassword(newPassword);
        } else {
          const newChar = newValue[newValue.length - 1];
          const newPassword = password + newChar;
          setPassword(newPassword);
        }
        return;
      }

      // MODIFY: If the length is the same, it's a replacement at non-masked position
      const charPos = nonMaskedPosition(newValue);
      const newChar = newValue[charPos];

      if (charPos === -1) return;

      const newPassword = replaceCharAtPosition(password, newChar!, charPos);
      setPassword(newPassword);
      return;
    },
    [password]
  );

  const nonMaskedPosition = (value: string): number => {
    // Find the index of the first non-maskChar character
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== maskChar) {
        return i;
      }
    }
    return -1;
  };

  const replaceCharAtPosition = (value: string, char: string, index: number) => {
    return value.slice(0, index) + char + value.slice(index + 1);
  };

  const insertCharAtPosition = (value: string, char: string, index: number) => {
    return value.slice(0, index) + char + value.slice(index);
  };

  const displayValue = useCallback(() => {
    return showPassword ? password : maskChar.repeat(password.length);
  }, [password, showPassword]);

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

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoading && (
            <>
              <Action.SubmitForm
                icon={Icon.LockUnlocked}
                title="Unlock"
                onSubmit={() => onSubmit()}
                shortcut={{ key: "enter", modifiers: [] }}
              />
              <Action
                icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
                title={showPassword ? "Hide Password" : "Show Password"}
                onAction={togglePasswordVisibility}
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
      <Form.TextField
        ref={inputRef}
        autoFocus
        id="password"
        title="Master Password"
        value={displayValue()}
        onChange={handlePasswordChange}
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
