import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { serializeError } from "../core/errors";
import { buyUrl } from "../license/config";
import { LicenseStatus, StoredLicense, statusLabel } from "../license/license-state";
import { UseLicense, useLicense } from "../license/useLicense";
import { formatDateTime } from "../ui/format";
import { SHORTCUTS } from "../ui/shortcuts";

function statusColor(status: LicenseStatus): Color {
  switch (status.kind) {
    case "pro":
      return status.source === "grace" ? Color.Orange : Color.Green;
    case "invalid":
      return Color.Red;
    case "offline":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

function statusDescription(status: LicenseStatus): string {
  switch (status.kind) {
    case "unconfigured":
      return "Revenue Bar Pro licensing is not set up in this build.";
    case "none":
      return "Free version: one provider and the Dashboard and Recent Sales commands.";
    case "pro":
      return status.source === "grace"
        ? "Lemon Squeezy could not be reached. Pro keeps working for 14 days after the last validation."
        : "All providers, the menu bar, subscriptions, refunds, customer search and CSV export are unlocked.";
    case "invalid":
      return status.message;
    case "offline":
      return `Could not reach Lemon Squeezy to validate the key (${status.message}).`;
    case "deactivated":
      return "This Mac's activation was released. Activate it again to use Pro here.";
  }
}

function licenseOf(status: LicenseStatus | undefined): StoredLicense | undefined {
  if (!status) return undefined;
  return "license" in status ? status.license : undefined;
}

function Actions(props: { license: UseLicense }) {
  const { license } = props;
  const status = license.status;
  const stored = licenseOf(status);

  const run = async (title: string, task: () => Promise<void>, success: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await task();
      toast.style = Toast.Style.Success;
      toast.title = success;
    } catch (error) {
      await toast.hide();
      await showFailureToast(serializeError(error).message, { title: "License action failed" });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title="License">
        {status?.kind === "deactivated" ? (
          <Action
            title="Activate on This Mac"
            icon={Icon.Key}
            onAction={() => run("Activating license…", license.activate, "License activated")}
          />
        ) : null}
        <Action
          title="Enter License Key"
          icon={Icon.Key}
          shortcut={SHORTCUTS.license}
          onAction={openExtensionPreferences}
        />
        {status && status.kind !== "none" && status.kind !== "unconfigured" ? (
          <Action
            title="Validate License"
            icon={Icon.ArrowClockwise}
            shortcut={SHORTCUTS.refresh}
            onAction={() => run("Validating license…", license.validate, "License checked")}
          />
        ) : null}
        <Action.OpenInBrowser title="Buy Revenue Bar Pro" icon={Icon.Cart} url={buyUrl()} />
      </ActionPanel.Section>
      {stored?.instanceId && !stored.deactivated ? (
        <ActionPanel.Section>
          <Action
            title="Deactivate on This Mac"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={SHORTCUTS.remove}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Deactivate License on This Mac?",
                message: "This frees one activation so you can use the key on another machine.",
                icon: Icon.Key,
                primaryAction: { title: "Deactivate", style: Alert.ActionStyle.Destructive },
              });
              if (confirmed) await run("Deactivating license…", license.deactivate, "License deactivated");
            }}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

export default function ManageLicense() {
  const license = useLicense({ notify: false });
  const status = license.status;
  const stored = licenseOf(status);

  return (
    <List isLoading={license.isLoading} navigationTitle="Manage License">
      {status ? (
        <List.Section title="Revenue Bar Pro">
          <List.Item
            icon={{ source: Icon.Key, tintColor: statusColor(status) }}
            title="Status"
            subtitle={statusDescription(status)}
            accessories={[{ tag: { value: statusLabel(status), color: statusColor(status) } }]}
            actions={<Actions license={license} />}
          />
          {stored?.customerName || stored?.customerEmail ? (
            <List.Item
              icon={Icon.Person}
              title="Licensed To"
              accessories={[{ text: [stored.customerName, stored.customerEmail].filter(Boolean).join(" · ") }]}
              actions={<Actions license={license} />}
            />
          ) : null}
          {stored?.activationLimit !== undefined || stored?.activationUsage !== undefined ? (
            <List.Item
              icon={Icon.Monitor}
              title="Activations"
              subtitle={stored?.instanceName}
              accessories={[
                {
                  text:
                    stored?.activationLimit !== undefined
                      ? `${stored?.activationUsage ?? 0} of ${stored.activationLimit}`
                      : String(stored?.activationUsage ?? 0),
                },
              ]}
              actions={<Actions license={license} />}
            />
          ) : null}
          {stored?.lastValidatedAt ? (
            <List.Item
              icon={Icon.Clock}
              title="Last Validated"
              accessories={[{ text: formatDateTime(new Date(stored.lastValidatedAt)) }]}
              actions={<Actions license={license} />}
            />
          ) : null}
          {stored?.expiresAt ? (
            <List.Item
              icon={Icon.Calendar}
              title="Expires"
              accessories={[{ text: formatDateTime(new Date(stored.expiresAt)) }]}
              actions={<Actions license={license} />}
            />
          ) : null}
        </List.Section>
      ) : null}
    </List>
  );
}
