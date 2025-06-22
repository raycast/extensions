import { useEffect } from "react";
import { Form, Action, ActionPanel, Toast, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useLoadingState } from "../hooks/useLoadingState";
import {
  SETTINGS_DEFAULT_BLOCK_SIZE,
  SETTINGS_DEFAULT_ENCRYPTED,
  SETTINGS_DEFAULT_PREFIX,
  SETTINGS_DEFAULT_RESTORE_FILE_NAME,
} from "../constraints";

export interface SettingsFromValues {
  blockSize: string;
  prefix: string;
  encrypted: boolean;
  restoreFileName: boolean;
}

export const initialSettings: SettingsFromValues = {
  blockSize: SETTINGS_DEFAULT_BLOCK_SIZE,
  prefix: SETTINGS_DEFAULT_PREFIX,
  encrypted: SETTINGS_DEFAULT_ENCRYPTED,
  restoreFileName: SETTINGS_DEFAULT_RESTORE_FILE_NAME,
};

function SettingsFrom({
  settings,
  setSettings,
  reset,
}: {
  settings: SettingsFromValues;
  setSettings: (values: SettingsFromValues) => Promise<void>;
  reset: () => Promise<void>;
}) {
  const { error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();

  useEffect(() => {
    if (error) {
      showErrorToast("Saving failed.", error);
    }
  }, [error]);

  const { handleSubmit, itemProps } = useForm<SettingsFromValues>({
    initialValues: settings ?? initialSettings,
    onSubmit: (values) => {
      try {
        setIsLoading(true);
        setError(undefined);
        setSettings(values);
        setIsLoading(false);
        showToast({
          style: Toast.Style.Success,
          title: "Settings saved.",
        });
      } catch (error) {
        handleError(error);
      }
    },
    validation: {
      blockSize: (value) => {
        if (!value) return "Block size is required";
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 64) {
          return "Block size must be between 1 and 64";
        }
      },
      prefix: FormValidation.Required,
      encrypted: FormValidation.Required,
    },
  });

  // Default view
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <ResetSettingsAction reset={reset} />
        </ActionPanel>
      }
    >
      <Form.Description title="How to use" text={"Please set the default settings."} />
      <Form.Separator />
      <Form.Description title="Image Encryption" text={""} />
      <Form.Checkbox
        title="Protection"
        label="Password"
        {...itemProps.encrypted}
        info={`Default: true\nIf disabled, images are only shuffled without password protection. If enabled, images require password for decryption.`}
      />
      <Form.TextField
        title="Block Size"
        placeholder="Enter block size (1-64)"
        {...itemProps.blockSize}
        info={`Default: 4\nFragment the image into multiple blocks and shuffle them.`}
      />
      <Form.TextField
        title="File Prefix"
        placeholder="Enter prefix name (e.g. img)"
        {...itemProps.prefix}
        info={`Default: img\nSet the prefix for encrypted filename.`}
      />
      <Form.Separator />
      <Form.Description title="Image Decryption" text={""} />
      <Form.Checkbox
        title="File Name"
        label="Original File Name"
        {...itemProps.restoreFileName}
        info={`Default: true\nRestore the original file name when decrypting.`}
      />
    </Form>
  );
}

export default SettingsFrom;

function ResetSettingsAction({ reset }: { reset: () => Promise<void> }) {
  return (
    <Action
      title="Reset Settings"
      onAction={async () => {
        await reset();
        await showToast({
          style: Toast.Style.Success,
          title: "Settings reset.",
        });
      }}
    />
  );
}
