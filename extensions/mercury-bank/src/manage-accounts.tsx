import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { useActiveAccount } from "./lib/hooks/useActiveAccount";
import {
  addStoredAccount,
  removeStoredAccount,
  updateStoredAccount,
  updateAccountCapabilities,
  setActiveAccountId,
} from "./lib/accounts";
import {
  probeFeatures,
  isFeatureEnabled,
  FEATURE_LABELS,
  FEATURES,
} from "./lib/features";
import type { FeatureKey } from "./lib/features";
import type { FeatureCapabilities, StoredAccount } from "./lib/types";
import { formatDateTime } from "./lib/utils";

export default function ManageAccounts() {
  const { activeAccount, storedAccounts, isLoading, revalidate } =
    useActiveAccount();
  const { push } = useNavigation();

  async function handleRemove(account: StoredAccount) {
    if (
      await confirmAlert({
        title: "Remove Account",
        message: `Remove "${account.name}"? This will delete the stored API key.`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await removeStoredAccount(account.id);
      await showToast({ style: Toast.Style.Success, title: "Account removed" });
      revalidate();
    }
  }

  async function handleSetActive(account: StoredAccount) {
    await setActiveAccountId(account.id);
    await showToast({
      style: Toast.Style.Success,
      title: `Switched to ${account.name}`,
    });
    revalidate();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage Mercury Accounts">
      <List.Section
        title="Accounts"
        subtitle={`${storedAccounts.length} configured`}
      >
        {storedAccounts.map((account) => (
          <List.Item
            key={account.id}
            title={account.name}
            subtitle={`Added ${formatDateTime(account.createdAt)}`}
            icon={
              account.id === activeAccount?.id
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            accessories={[
              account.id === activeAccount?.id
                ? { tag: { value: "Active", color: Color.Green } }
                : {},
              { text: `Key: ****${account.apiKey.slice(-4)}` },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {account.id !== activeAccount?.id && (
                    <Action
                      title="Set as Active"
                      icon={Icon.CheckCircle}
                      onAction={() => handleSetActive(account)}
                    />
                  )}
                  <Action
                    title="Edit Account"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() =>
                      push(
                        <EditAccountForm
                          account={account}
                          onSave={revalidate}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Feature Settings"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() =>
                      push(
                        <FeatureSettings
                          account={account}
                          onSave={revalidate}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Remove Account"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleRemove(account)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Add New Account"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() =>
                      push(<AddAccountForm onSave={revalidate} />)
                    }
                  />
                  <Action
                    title="Re-detect Permissions"
                    icon={Icon.MagnifyingGlass}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Detecting API permissions...",
                      });
                      try {
                        const caps = await probeFeatures(account.apiKey);
                        caps.overrides = account.capabilities?.overrides ?? {};
                        await updateAccountCapabilities(account.id, caps);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Permissions updated",
                        });
                        revalidate();
                      } catch (e) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Detection failed",
                          message: String(e),
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {storedAccounts.length === 0 && (
        <List.EmptyView
          title="No Accounts Configured"
          description="Press Enter to add your first Mercury API key"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action
                title="Add Account"
                icon={Icon.Plus}
                onAction={() => push(<AddAccountForm onSave={revalidate} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function AddAccountForm({ onSave }: { onSave: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { name: string; apiKey: string }) {
    if (!values.name.trim() || !values.apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please fill in all fields",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding account",
        message: "Detecting API permissions...",
      });
      await addStoredAccount(values.name.trim(), values.apiKey.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "Account added",
        message: values.name,
      });
      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Mercury Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Account"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Account Name"
        placeholder="e.g., Personal, Business"
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Enter your Mercury API key"
      />
      <Form.Description text="Get your API key from Mercury Dashboard → Settings → API Tokens" />
    </Form>
  );
}

function EditAccountForm({
  account,
  onSave,
}: {
  account: StoredAccount;
  onSave: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { name: string; apiKey: string }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const updates: Partial<
        Pick<StoredAccount, "name" | "apiKey" | "capabilities">
      > = {
        name: values.name.trim(),
      };
      if (values.apiKey.trim()) {
        updates.apiKey = values.apiKey.trim();
        try {
          const caps = await probeFeatures(values.apiKey.trim());
          updates.capabilities = caps;
        } catch {
          // probing failure is non-fatal
        }
      }
      await updateStoredAccount(account.id, updates);
      await showToast({ style: Toast.Style.Success, title: "Account updated" });
      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Edit ${account.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Account Name"
        defaultValue={account.name}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Leave empty to keep current key"
      />
    </Form>
  );
}

const TOGGLEABLE_FEATURES: FeatureKey[] = [
  FEATURES.cards,
  FEATURES.recipients,
  FEATURES.payments,
  FEATURES.invoices,
  FEATURES.customers,
  FEATURES.organization,
  FEATURES.team,
  FEATURES.treasury,
  FEATURES.credit,
  FEATURES.statements,
  FEATURES.categories,
  FEATURES.events,
  FEATURES.webhooks,
];

function FeatureSettings({
  account,
  onSave,
}: {
  account: StoredAccount;
  onSave: () => void;
}) {
  const [isProbing, setIsProbing] = useState(false);
  const [capabilities, setCapabilities] = useState<FeatureCapabilities>(
    account.capabilities ?? { detected: {}, overrides: {}, probedAt: "" },
  );

  async function handleToggle(feature: FeatureKey) {
    const currentEnabled = isFeatureEnabled(capabilities, feature);
    const newValue = !currentEnabled;
    const detected = capabilities.detected[feature] ?? true;
    const newOverrides = { ...capabilities.overrides };
    if (newValue === detected) {
      delete newOverrides[feature];
    } else {
      newOverrides[feature] = newValue;
    }
    const newCaps: FeatureCapabilities = {
      ...capabilities,
      overrides: newOverrides,
    };
    await updateAccountCapabilities(account.id, newCaps);
    setCapabilities(newCaps);
    onSave();
    await showToast({
      style: Toast.Style.Success,
      title: `${FEATURE_LABELS[feature]} ${newValue ? "enabled" : "disabled"}`,
    });
  }

  async function handleResetOverride(feature: FeatureKey) {
    const newOverrides = { ...capabilities.overrides };
    delete newOverrides[feature];
    const newCaps: FeatureCapabilities = {
      ...capabilities,
      overrides: newOverrides,
    };
    await updateAccountCapabilities(account.id, newCaps);
    setCapabilities(newCaps);
    onSave();
    await showToast({
      style: Toast.Style.Success,
      title: `${FEATURE_LABELS[feature]} reset to detected`,
    });
  }

  async function handleRedetect() {
    setIsProbing(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Detecting API permissions...",
    });
    try {
      const caps = await probeFeatures(account.apiKey);
      caps.overrides = capabilities.overrides;
      setCapabilities(caps);
      await updateAccountCapabilities(account.id, caps);
      await showToast({
        style: Toast.Style.Success,
        title: "Permissions updated",
      });
      onSave();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Detection failed",
        message: String(e),
      });
    } finally {
      setIsProbing(false);
    }
  }

  return (
    <List
      isLoading={isProbing}
      navigationTitle={`Feature Settings - ${account.name}`}
    >
      <List.Section title="Features">
        {TOGGLEABLE_FEATURES.map((feature) => {
          const enabled = isFeatureEnabled(capabilities, feature);
          const detected = capabilities.detected[feature] ?? true;
          const hasOverride = capabilities.overrides[feature] !== undefined;
          const accessories: List.Item.Accessory[] = [];
          if (!detected) {
            accessories.push({
              tag: { value: "No API Access", color: Color.Orange },
            });
          }
          if (hasOverride) {
            accessories.push({ tag: { value: "Override", color: Color.Blue } });
          }
          accessories.push({
            tag: {
              value: enabled ? "Enabled" : "Disabled",
              color: enabled ? Color.Green : Color.Red,
            },
          });

          return (
            <List.Item
              key={`${feature}-${enabled}`}
              title={FEATURE_LABELS[feature]}
              icon={
                enabled
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.XMarkCircle, tintColor: Color.Red }
              }
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={enabled ? "Disable Feature" : "Enable Feature"}
                    icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                    onAction={() => handleToggle(feature)}
                  />
                  {hasOverride && (
                    <Action
                      title="Reset to Detected"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => handleResetOverride(feature)}
                    />
                  )}
                  <Action
                    title="Re-detect All Permissions"
                    icon={Icon.MagnifyingGlass}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={handleRedetect}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {capabilities.probedAt && (
        <List.Section title="Info">
          <List.Item
            title="Last Probed"
            subtitle={formatDateTime(capabilities.probedAt)}
            icon={Icon.Clock}
          />
        </List.Section>
      )}
    </List>
  );
}