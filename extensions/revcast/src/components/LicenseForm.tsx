import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import { LicenseState } from "../lib/types";

type LicenseFormProps = {
  initialLicense?: LicenseState | null;
  onDidSave: (input: {
    instanceName: string;
    licenseKey: string;
  }) => Promise<unknown>;
};

type FormValues = {
  instanceName: string;
  licenseKey: string;
};

export function LicenseForm({ initialLicense, onDidSave }: LicenseFormProps) {
  const { pop } = useNavigation();
  const [instanceNameError, setInstanceNameError] = useState<
    string | undefined
  >();
  const [licenseKeyError, setLicenseKeyError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    let hasError = false;
    const instanceName = values.instanceName.trim();
    const licenseKey = values.licenseKey.trim();

    if (!instanceName) {
      setInstanceNameError("Give this activation a device name.");
      hasError = true;
    }

    if (!licenseKey) {
      setLicenseKeyError("Enter your Dodo license key.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Activating license...",
      });

      await onDidSave({ instanceName, licenseKey });

      toast.style = Toast.Style.Success;
      toast.title = "License activated";
      toast.message = "Paid features are now available on this device.";
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't activate license",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Activate License"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Activate License" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Use the license key emailed by Dodo Payments after purchasing Pro." />
      <Form.TextField
        id="instanceName"
        title="Device Name"
        defaultValue={initialLicense?.instanceName ?? "My Mac"}
        error={instanceNameError}
        onChange={() => setInstanceNameError(undefined)}
      />
      <Form.PasswordField
        id="licenseKey"
        title="License Key"
        placeholder="lic_..."
        error={licenseKeyError}
        onChange={() => setLicenseKeyError(undefined)}
      />
    </Form>
  );
}
