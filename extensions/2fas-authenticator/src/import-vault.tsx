import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  confirmAlert,
  Alert,
} from "@raycast/api";
import {
  parse2FASExport,
  InvalidPasswordError,
  InvalidFormatError,
} from "./lib/import-2fas";
import { createVault, isVaultConfigured, deleteVault } from "./lib/vault";

export default function ImportVault() {
  const [isLoading, setIsLoading] = useState(false);
  const replacing = isVaultConfigured();

  async function handleSubmit(values: { file: string[]; password: string }) {
    const filePath = values.file?.[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
      });
      return;
    }

    if (replacing) {
      const confirmed = await confirmAlert({
        title: "Replace Existing Vault?",
        message: "This will overwrite your current vault with new data.",
        primaryAction: {
          title: "Replace",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
      deleteVault();
    }

    setIsLoading(true);
    try {
      const services = parse2FASExport(filePath, values.password || undefined);
      if (services.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No TOTP services found in export",
        });
        return;
      }
      createVault(services);
      await showToast({
        style: Toast.Style.Success,
        title: `Imported ${services.length} services`,
      });
      await popToRoot();
    } catch (error) {
      if (error instanceof InvalidPasswordError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Wrong password",
        });
      } else if (error instanceof InvalidFormatError) {
        await showToast({ style: Toast.Style.Failure, title: error.message });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={replacing ? "Re-Import" : "Import"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          replacing
            ? "Re-import a 2FAS export to replace your current vault."
            : "Import a 2FAS export file (.2fas) to create your local vault."
        }
      />
      <Form.FilePicker
        id="file"
        title="2FAS Export File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.PasswordField
        id="password"
        title="Export Password"
        placeholder="Leave empty if unencrypted"
      />
    </Form>
  );
}
