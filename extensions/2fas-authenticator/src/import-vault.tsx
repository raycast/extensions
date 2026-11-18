import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import {
  parse2FASExport,
  InvalidPasswordError,
  InvalidFormatError,
} from "./lib/import-2fas";
import { createVault, isVaultConfigured, replaceVault } from "./lib/vault";

function looksLikeExport(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".2fas") || lower.endsWith(".json");
}

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
    if (!looksLikeExport(filePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Expected a .2fas export",
        message: "Pick the file exported from the 2FAS app",
      });
      return;
    }

    setIsLoading(true);
    const parseToast = await showToast({
      style: Toast.Style.Animated,
      title: values.password ? "Decrypting export…" : "Reading export…",
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      const services = parse2FASExport(filePath, values.password || undefined);
      parseToast.hide();
      if (services.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No TOTP services found in export",
        });
        return;
      }
      if (replacing) {
        const confirmed = await confirmAlert({
          title: "Replace Existing Vault?",
          message: `New export parsed successfully (${services.length} services). Replace your current vault now?`,
          primaryAction: {
            title: "Replace",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) {
          await showToast({
            style: Toast.Style.Success,
            title: "Replace cancelled. Existing vault unchanged.",
          });
          return;
        }
      }
      const encryptToast = await showToast({
        style: Toast.Style.Animated,
        title: replacing ? "Replacing vault…" : "Encrypting vault…",
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      try {
        if (replacing) {
          replaceVault(services);
        } else {
          createVault(services);
        }
      } finally {
        encryptToast.hide();
      }
      await showToast({
        style: Toast.Style.Success,
        title: replacing
          ? `Replaced vault (${services.length} services)`
          : `Imported ${services.length} services`,
      });
      await popToRoot();
    } catch (error) {
      parseToast.hide();
      if (error instanceof InvalidPasswordError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Wrong password",
          message: replacing ? "Existing vault left intact" : undefined,
        });
      } else if (error instanceof InvalidFormatError) {
        await showToast({
          style: Toast.Style.Failure,
          title: error.message,
          message: replacing ? "Existing vault left intact" : undefined,
        });
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
            icon={Icon.Download}
            title={replacing ? "Re-Import" : "Import"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          replacing
            ? "Re-import a 2FAS export to replace your current vault. If the new export fails to load, your existing vault is preserved."
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
