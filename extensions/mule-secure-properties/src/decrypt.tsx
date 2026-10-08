import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { ALGORITHMS, MODES, SUCCESS_MESSAGES } from "./constants";
import {
  cleanEncryptedText,
  ensureJarAvailable,
  formatCliCommand,
  type FormSettings,
  getPasswordFieldInfo,
  handleOperationError,
  type MuleSecurePropertiesPreferences,
  resolveJarDownloadConfig,
  resolvePassword,
  runSecurePropertiesOperation,
  supportsRandomIV,
  usePersistedFormSettings,
  validateKeyLength,
} from "./utils";

interface DecryptionForm {
  encryptedText: string;
  password?: string;
  algorithm: string;
  mode: string;
  useRandomIV: boolean;
  stripWrapper: boolean;
}

const preferences = getPreferenceValues<MuleSecurePropertiesPreferences>();

export default function Command() {
  const { settings, isLoading, persist } = usePersistedFormSettings();

  if (isLoading || !settings) {
    return <Form isLoading />;
  }

  return <DecryptForm settings={settings} persist={persist} />;
}

const DecryptForm = ({
  settings,
  persist,
}: Readonly<{
  settings: FormSettings;
  persist: (partial: Partial<FormSettings>) => Promise<void>;
}>) => {
  const [isWorking, setIsWorking] = useState(false);

  const { handleSubmit, itemProps, values, reset, setValue } = useForm<DecryptionForm>({
    initialValues: {
      password: preferences.defaultPassword,
      algorithm: settings.algorithm,
      mode: settings.mode,
      useRandomIV: settings.useRandomIV && supportsRandomIV(settings.mode),
      stripWrapper: settings.stripWrapper,
    },
    onSubmit: async (formValues) => {
      const { encryptedText, password, algorithm, mode, useRandomIV, stripWrapper } = formValues;
      setIsWorking(true);

      try {
        await ensureJarAvailable(resolveJarDownloadConfig(preferences));

        const decryptionPassword = await resolvePassword(password, preferences.defaultPassword);
        if (!decryptionPassword) {
          return;
        }

        const keyError = validateKeyLength(algorithm, decryptionPassword);
        if (keyError) {
          await showToast({ style: Toast.Style.Failure, title: "Invalid Key Length", message: keyError });
          return;
        }

        const randomIV = useRandomIV && supportsRandomIV(mode);
        const input = stripWrapper ? cleanEncryptedText(encryptedText) : encryptedText.trim();
        const output = await runSecurePropertiesOperation({
          operation: "decrypt",
          input,
          password: decryptionPassword,
          algorithm,
          mode,
          useRandomIV: randomIV,
        });

        await persist({ algorithm, mode, useRandomIV: randomIV, stripWrapper });

        await Clipboard.copy(output);
        await showHUD(SUCCESS_MESSAGES.DECRYPT_SUCCESS);
        reset({ password: preferences.defaultPassword, algorithm, mode, useRandomIV: randomIV, stripWrapper });
        await closeMainWindow();
      } catch (error) {
        await handleOperationError(error, "Decryption");
      } finally {
        setIsWorking(false);
      }
    },
    validation: {
      encryptedText: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (!supportsRandomIV(values.mode) && values.useRandomIV) {
      setValue("useRandomIV", false);
    }
  }, [setValue, values.mode, values.useRandomIV]);

  const randomIVEnabled = supportsRandomIV(values.mode);

  const copyCliCommand = async () => {
    const decryptionPassword = values.password?.trim() || preferences.defaultPassword?.trim();
    if (!values.encryptedText?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Value Required",
        message: "Paste an encrypted value before copying the CLI command.",
      });
      return;
    }
    if (!decryptionPassword) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Password Required",
        message: "Enter a password or set the default in preferences.",
      });
      return;
    }

    const input = values.stripWrapper ? cleanEncryptedText(values.encryptedText) : values.encryptedText.trim();
    const command = formatCliCommand({
      operation: "decrypt",
      input,
      password: decryptionPassword,
      algorithm: values.algorithm,
      mode: values.mode,
      useRandomIV: values.useRandomIV && randomIVEnabled,
    });

    await Clipboard.copy(command);
    await showHUD(SUCCESS_MESSAGES.COMMAND_COPIED);
  };

  return (
    <Form
      isLoading={isWorking}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.LockUnlocked} title="Decrypt and Copy" onSubmit={handleSubmit} />
          <Action icon={Icon.Terminal} title="Copy CLI Command" onAction={copyCliCommand} />
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Encrypted Value"
        placeholder="Paste ciphertext or ![encrypted-value]"
        {...itemProps.encryptedText}
      />

      <Form.PasswordField
        title="Password"
        placeholder="Secure properties key"
        info={getPasswordFieldInfo(values.algorithm)}
        {...itemProps.password}
      />

      <Form.Dropdown
        title="Algorithm"
        info="Must match the algorithm used when the value was encrypted."
        {...itemProps.algorithm}
      >
        {ALGORITHMS.map((algo) => (
          <Form.Dropdown.Item key={algo.value} value={algo.value} title={algo.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Mode" info="Must match the mode used when the value was encrypted." {...itemProps.mode}>
        {MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.label} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        label="Use Random IV"
        info={
          randomIVEnabled
            ? "Enable if the value was encrypted with useRandomIVs=true."
            : "ECB mode does not use an initialization vector."
        }
        {...itemProps.useRandomIV}
        value={randomIVEnabled ? values.useRandomIV : false}
        onChange={(value) => {
          if (randomIVEnabled) {
            setValue("useRandomIV", value);
          }
        }}
      />

      <Form.Checkbox
        label="Strip ![...] Wrapper"
        info="Removes the ![...] wrapper commonly used in Mule configuration files."
        {...itemProps.stripWrapper}
      />
    </Form>
  );
};
