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
  validateInputValue,
  validateKeyLength,
  wrapEncryptedValue,
} from "./utils";

interface EncryptionForm {
  prompt: string;
  password?: string;
  algorithm: string;
  mode: string;
  useRandomIV: boolean;
  wrapOutput: boolean;
}

const preferences = getPreferenceValues<MuleSecurePropertiesPreferences>();

export default function Command() {
  const { settings, isLoading, persist } = usePersistedFormSettings();

  if (isLoading || !settings) {
    return <Form isLoading />;
  }

  return <EncryptForm settings={settings} persist={persist} />;
}

const EncryptForm = ({
  settings,
  persist,
}: Readonly<{
  settings: FormSettings;
  persist: (partial: Partial<FormSettings>) => Promise<void>;
}>) => {
  const [isWorking, setIsWorking] = useState(false);

  const { handleSubmit, itemProps, values, reset, setValue } = useForm<EncryptionForm>({
    initialValues: {
      password: preferences.defaultPassword,
      algorithm: settings.algorithm,
      mode: settings.mode,
      useRandomIV: settings.useRandomIV && supportsRandomIV(settings.mode),
      wrapOutput: settings.wrapOutput,
    },
    onSubmit: async (formValues) => {
      const { prompt, password, algorithm, mode, useRandomIV, wrapOutput } = formValues;
      setIsWorking(true);

      try {
        const inputError = validateInputValue(prompt);
        if (inputError) {
          await showToast({ style: Toast.Style.Failure, title: "Invalid Value", message: inputError });
          return;
        }

        await ensureJarAvailable(resolveJarDownloadConfig(preferences));

        const encryptionPassword = await resolvePassword(password, preferences.defaultPassword);
        if (!encryptionPassword) {
          return;
        }

        const keyError = validateKeyLength(algorithm, encryptionPassword);
        if (keyError) {
          await showToast({ style: Toast.Style.Failure, title: "Invalid Key Length", message: keyError });
          return;
        }

        const randomIV = useRandomIV && supportsRandomIV(mode);
        const output = await runSecurePropertiesOperation({
          operation: "encrypt",
          input: prompt,
          password: encryptionPassword,
          algorithm,
          mode,
          useRandomIV: randomIV,
        });

        await persist({ algorithm, mode, useRandomIV: randomIV, wrapOutput });

        const finalOutput = wrapOutput ? wrapEncryptedValue(output) : output;
        await Clipboard.copy(finalOutput);
        await showHUD(SUCCESS_MESSAGES.ENCRYPT_SUCCESS);
        reset({ password: preferences.defaultPassword, algorithm, mode, useRandomIV: randomIV, wrapOutput });
        await closeMainWindow();
      } catch (error) {
        await handleOperationError(error, "Encryption");
      } finally {
        setIsWorking(false);
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (!supportsRandomIV(values.mode) && values.useRandomIV) {
      setValue("useRandomIV", false);
    }
  }, [setValue, values.mode, values.useRandomIV]);

  const randomIVEnabled = supportsRandomIV(values.mode);

  const copyCliCommand = async () => {
    const encryptionPassword = values.password?.trim() || preferences.defaultPassword?.trim();
    if (!values.prompt?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Value Required",
        message: "Enter a value before copying the CLI command.",
      });
      return;
    }
    if (!encryptionPassword) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Password Required",
        message: "Enter a password or set the default in preferences.",
      });
      return;
    }

    const command = formatCliCommand({
      operation: "encrypt",
      input: values.prompt,
      password: encryptionPassword,
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
          <Action.SubmitForm icon={Icon.Lock} title="Encrypt and Copy" onSubmit={handleSubmit} />
          <Action icon={Icon.Terminal} title="Copy CLI Command" onAction={copyCliCommand} />
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Value"
        placeholder="Secret to encrypt (e.g. password or client secret)"
        {...itemProps.prompt}
      />

      <Form.PasswordField
        title="Password"
        placeholder="Secure properties key"
        info={getPasswordFieldInfo(values.algorithm)}
        {...itemProps.password}
      />

      <Form.Dropdown
        title="Algorithm"
        info="Must match the algorithm configured in your Mule secure properties."
        {...itemProps.algorithm}
      >
        {ALGORITHMS.map((algo) => (
          <Form.Dropdown.Item key={algo.value} value={algo.value} title={algo.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Mode"
        info="Must match the mode configured in your Mule secure properties."
        {...itemProps.mode}
      >
        {MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.label} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        label="Use Random IV"
        info={
          randomIVEnabled
            ? "Prepends a random IV (useRandomIVs=true in your Mule config). Required for matching decrypt."
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
        label="Wrap as ![...]"
        info="Wraps the ciphertext for pasting into Mule YAML/properties files."
        {...itemProps.wrapOutput}
      />
    </Form>
  );
};
