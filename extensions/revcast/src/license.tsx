import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";

import { LicenseForm } from "./components/LicenseForm";
import { useLicense } from "./hooks/useLicense";
import {
  getLicenseConfigurationError,
  getPricingUrl,
  isLicenseBackendConfigured,
} from "./lib/license-service";

function getLicenseMarkdown() {
  return `# Unlock Pro

Starter includes one live Stripe project.

Activate your Dodo Pro license to unlock unlimited local workspaces on this device.

- Pro activates instantly after purchase
- Billing is managed through Dodo Payments
- You can refresh or release this device at any time
`;
}

function getUnconfiguredLicenseMarkdown() {
  return `# Billing setup is not connected yet

Starter still works for public users right away.

To activate Pro, set a hosted Revcast Cloud URL in this extension's preferences.

- This should point to your deployed website
- The website must expose the Dodo license APIs
- Once configured, activation and billing actions will work from Raycast
`;
}

function getActiveLicenseMarkdown(input: {
  customerEmail: string;
  customerName: string;
  instanceName: string;
  licenseStatus: string;
  plan: string;
  status: string;
  subscriptionStatus: string | null;
  updatedAt: string;
}) {
  return `# ${input.plan.toUpperCase()} plan active

- Customer: ${input.customerName} (${input.customerEmail})
- Device: ${input.instanceName}
- Local status: ${input.status}
- License status: ${input.licenseStatus}
- Subscription status: ${input.subscriptionStatus ?? "unknown"}
- Last checked: ${new Date(input.updatedAt).toLocaleString()}
`;
}

export default function LicenseCommand() {
  const license = useLicense();
  const isBackendConfigured = isLicenseBackendConfigured();
  const pricingUrl = getPricingUrl();

  async function handleRefresh() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing license...",
    });

    try {
      const nextLicense = await license.refreshLicense();

      toast.style = Toast.Style.Success;
      toast.title =
        nextLicense?.status === "active"
          ? "License is active"
          : "License needs attention";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't refresh license";
      toast.message =
        error instanceof Error ? error.message : "Please try again.";
    }
  }

  async function handleOpenPortal() {
    if (!license.license) {
      return;
    }

    try {
      const portal = await license.openBillingPortal();

      if (portal?.url) {
        await open(portal.url);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open billing portal",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleClearLicense() {
    const confirmed = await confirmAlert({
      title: "Remove this license from the device?",
      message: "Starter limits will apply again until you reactivate.",
      primaryAction: {
        title: "Remove License",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await license.clearLicense();
    await showToast({
      style: Toast.Style.Success,
      title: "License removed",
    });
  }

  async function handleReleaseLicense() {
    const confirmed = await confirmAlert({
      title: "Release this device activation?",
      message: "This tells Dodo to deactivate the current device instance.",
      primaryAction: {
        title: "Release Device",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await license.releaseLicense();
      await showToast({
        style: Toast.Style.Success,
        title: "Device released",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't release device",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const activeLicense = license.license;
  const markdown = activeLicense
    ? getActiveLicenseMarkdown(activeLicense)
    : isBackendConfigured
      ? getLicenseMarkdown()
      : getUnconfiguredLicenseMarkdown();

  return (
    <Detail
      isLoading={license.isLoading}
      navigationTitle="License & Billing"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isBackendConfigured ? (
              <Action.Push
                title={activeLicense ? "Replace License" : "Activate License"}
                icon={Icon.Key}
                target={
                  <LicenseForm
                    initialLicense={activeLicense}
                    onDidSave={license.activateLicense}
                  />
                }
              />
            ) : (
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
            )}
            <Action
              title="Refresh License"
              icon={Icon.ArrowClockwise}
              onAction={() => void handleRefresh()}
            />
            {pricingUrl ? (
              <Action.OpenInBrowser
                title="See Plans"
                icon={Icon.Store}
                url={pricingUrl}
              />
            ) : (
              <Action
                title="Why Billing Is Disabled"
                icon={Icon.Info}
                onAction={() =>
                  void showToast({
                    style: Toast.Style.Failure,
                    title: "Billing needs a hosted backend",
                    message: getLicenseConfigurationError(),
                  })
                }
              />
            )}
            {activeLicense ? (
              <Action
                title="Open Billing Portal"
                icon={Icon.Link}
                onAction={() => void handleOpenPortal()}
              />
            ) : null}
          </ActionPanel.Section>
          {activeLicense ? (
            <ActionPanel.Section>
              <Action
                title="Release Device"
                icon={Icon.Eject}
                style={Action.Style.Destructive}
                onAction={() => void handleReleaseLicense()}
              />
              <Action
                title="Clear Local License"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void handleClearLicense()}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
