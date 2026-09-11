import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  SimpleFinAccount,
  ThemeColor,
  formatAmount,
  getAccountSet,
  getPrefs,
  getThemeColors,
  signedBalance,
  sortAccountsAndOrgs,
} from "./simplefin";

function OrgSettingsForm({
  orgKey,
  settings,
  onSaved,
}: {
  orgKey: string;
  settings: Record<string, string>;
  onSaved: (newSettings: Record<string, string>) => void;
}) {
  const { pop } = useNavigation();
  const settingsKey = `org_${orgKey}`;
  const currentName = settings[settingsKey];

  return (
    <Form
      navigationTitle={`Rename ${orgKey}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Institution Name"
            onSubmit={async (values) => {
              const newName = values.name.trim();
              const newSettings: Record<string, string> = { ...settings };

              if (newName && newName !== orgKey) {
                await LocalStorage.setItem(settingsKey, newName);
                newSettings[settingsKey] = newName;
              } else {
                await LocalStorage.removeItem(settingsKey);
                delete newSettings[settingsKey];
              }

              onSaved(newSettings);
              await showToast({
                style: Toast.Style.Success,
                title: "Institution Renamed",
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Original name: ${orgKey}`} />
      <Form.TextField
        id="name"
        title="Institution Name"
        defaultValue={currentName || orgKey}
      />
    </Form>
  );
}

function AccountSettingsForm({
  account,
  settings,
  onSaved,
}: {
  account: SimpleFinAccount;
  settings: Record<string, string>;
  onSaved: (id: string, newSettings: Record<string, string>) => void;
}) {
  const { pop } = useNavigation();
  const currentName = settings[account.id];
  const isHidden = settings[`hide_${account.id}`] === "true";
  const isExcluded = settings[`exclude_${account.id}`] === "true";
  const isInverted = settings[`invert_${account.id}`] === "true";

  return (
    <Form
      navigationTitle={`Settings for ${account.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            onSubmit={async (values) => {
              const newName = values.name.trim();
              const newSettings: Record<string, string> = { ...settings };

              if (newName) {
                await LocalStorage.setItem(account.id, newName);
                newSettings[account.id] = newName;
              } else {
                await LocalStorage.removeItem(account.id);
                delete newSettings[account.id];
              }

              if (values.hidden) {
                await LocalStorage.setItem(`hide_${account.id}`, "true");
                newSettings[`hide_${account.id}`] = "true";
              } else {
                await LocalStorage.removeItem(`hide_${account.id}`);
                delete newSettings[`hide_${account.id}`];
              }

              if (values.excluded) {
                await LocalStorage.setItem(`exclude_${account.id}`, "true");
                newSettings[`exclude_${account.id}`] = "true";
              } else {
                await LocalStorage.removeItem(`exclude_${account.id}`);
                delete newSettings[`exclude_${account.id}`];
              }

              if (values.inverted) {
                await LocalStorage.setItem(`invert_${account.id}`, "true");
                newSettings[`invert_${account.id}`] = "true";
              } else {
                await LocalStorage.removeItem(`invert_${account.id}`);
                delete newSettings[`invert_${account.id}`];
              }

              onSaved(account.id, newSettings);
              await showToast({
                style: Toast.Style.Success,
                title: "Settings Saved",
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Original name: ${account.name}`} />
      <Form.TextField
        id="name"
        title="Display Name"
        defaultValue={currentName || account.name}
      />
      <Form.Checkbox
        id="hidden"
        label="Hide account entirely"
        defaultValue={isHidden}
      />
      <Form.Checkbox
        id="excluded"
        label="Exclude from Net Total"
        defaultValue={isExcluded}
      />
      <Form.Checkbox
        id="inverted"
        label="Invert Balance Sign"
        defaultValue={isInverted}
      />
    </Form>
  );
}

export default function Command() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const prefs = getPrefs();
  const defaultCurrency = prefs.prefDefaultCurrency;
  const { posColor, negColor } = getThemeColors(prefs);

  const { data, isLoading, error } = usePromise(async () => {
    const accountSet = await getAccountSet(false);
    const local = await LocalStorage.allItems<Record<string, string>>();
    setSettings(local);
    return accountSet;
  });

  const accounts = data?.accounts ?? [];
  const orgEntries = sortAccountsAndOrgs(accounts, settings);

  const moveAccount = async (accountId: string, direction: 1 | -1) => {
    let order: string[] = [];
    try {
      if (settings["accountOrder"])
        order = JSON.parse(settings["accountOrder"]);
    } catch {
      // ignore invalid JSON
    }

    if (order.length === 0) {
      order = accounts.map((a) => a.id);
    }

    const idx = order.indexOf(accountId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;

    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    const newOrderStr = JSON.stringify(order);
    await LocalStorage.setItem("accountOrder", newOrderStr);
    setSettings({ ...settings, accountOrder: newOrderStr });
  };

  const moveOrg = async (orgKey: string, direction: 1 | -1) => {
    let order: string[] = [];
    try {
      if (settings["orgOrder"]) order = JSON.parse(settings["orgOrder"]);
    } catch {
      // ignore invalid JSON
    }

    if (order.length === 0) {
      order = orgEntries.map((e) => e.orgKey);
    }

    const idx = order.indexOf(orgKey);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;

    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    const newOrderStr = JSON.stringify(order);
    await LocalStorage.setItem("orgOrder", newOrderStr);
    setSettings({ ...settings, orgOrder: newOrderStr });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts...">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : accounts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Wallet} title="No Accounts Found" />
      ) : null}

      {orgEntries.map(({ orgKey, orgAccounts }) => {
        const orgDisplayName = settings[`org_${orgKey}`] || orgKey;

        return (
          <List.Section key={orgKey} title={orgDisplayName}>
            {orgAccounts.map((account) => {
              const customName = settings[account.id];
              const isHidden = settings[`hide_${account.id}`] === "true";
              const isExcluded = settings[`exclude_${account.id}`] === "true";

              const displayName = customName || account.name;
              const balance = signedBalance(account, settings);
              const formattedBalance = formatAmount(
                balance,
                account.currency,
                defaultCurrency,
              );
              const isNegative = balance < 0;
              const color: ThemeColor = isNegative ? negColor : posColor;

              const accessories: List.Item.Accessory[] = [];
              if (isHidden)
                accessories.push({ text: "Hidden", icon: Icon.EyeDisabled });
              else if (isExcluded)
                accessories.push({ text: "Excluded", icon: Icon.MinusCircle });
              accessories.push({ tag: { value: formattedBalance, color } });

              return (
                <List.Item
                  key={account.id}
                  icon={{ source: Icon.Wallet, tintColor: color }}
                  title={displayName}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          title="Edit Account Settings"
                          icon={Icon.Pencil}
                          target={
                            <AccountSettingsForm
                              account={account}
                              settings={settings}
                              onSaved={(id, newSettings) => {
                                setSettings(newSettings);
                              }}
                            />
                          }
                        />
                        <Action.Push
                          title="Rename Institution"
                          icon={Icon.Building}
                          target={
                            <OrgSettingsForm
                              orgKey={orgKey}
                              settings={settings}
                              onSaved={setSettings}
                            />
                          }
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section title="Reorder">
                        <Action
                          title="Move Account Up"
                          icon={Icon.ArrowUp}
                          shortcut={{
                            modifiers: ["cmd", "opt"],
                            key: "arrowUp",
                          }}
                          onAction={() => moveAccount(account.id, -1)}
                        />
                        <Action
                          title="Move Account Down"
                          icon={Icon.ArrowDown}
                          shortcut={{
                            modifiers: ["cmd", "opt"],
                            key: "arrowDown",
                          }}
                          onAction={() => moveAccount(account.id, 1)}
                        />
                        <Action
                          title="Move Institution Up"
                          icon={Icon.ArrowUpCircle}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "arrowUp",
                          }}
                          onAction={() => moveOrg(orgKey, -1)}
                        />
                        <Action
                          title="Move Institution Down"
                          icon={Icon.ArrowDownCircle}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "arrowDown",
                          }}
                          onAction={() => moveOrg(orgKey, 1)}
                        />
                      </ActionPanel.Section>
                      <Action
                        title={isHidden ? "Unhide Account" : "Hide Account"}
                        icon={isHidden ? Icon.Eye : Icon.EyeDisabled}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={async () => {
                          const nextVal = !isHidden;
                          if (nextVal) {
                            await LocalStorage.setItem(
                              `hide_${account.id}`,
                              "true",
                            );
                          } else {
                            await LocalStorage.removeItem(`hide_${account.id}`);
                          }
                          setSettings((prev) => {
                            const next = { ...prev };
                            if (nextVal) next[`hide_${account.id}`] = "true";
                            else delete next[`hide_${account.id}`];
                            return next;
                          });
                          await showToast({
                            style: Toast.Style.Success,
                            title: nextVal
                              ? "Account Hidden"
                              : "Account Unhidden",
                          });
                        }}
                      />
                      <Action
                        title={
                          isExcluded
                            ? "Include in Net Total"
                            : "Exclude from Net Total"
                        }
                        icon={isExcluded ? Icon.PlusCircle : Icon.MinusCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                        onAction={async () => {
                          const nextVal = !isExcluded;
                          if (nextVal) {
                            await LocalStorage.setItem(
                              `exclude_${account.id}`,
                              "true",
                            );
                          } else {
                            await LocalStorage.removeItem(
                              `exclude_${account.id}`,
                            );
                          }
                          setSettings((prev) => {
                            const next = { ...prev };
                            if (nextVal) next[`exclude_${account.id}`] = "true";
                            else delete next[`exclude_${account.id}`];
                            return next;
                          });
                          await showToast({
                            style: Toast.Style.Success,
                            title: nextVal
                              ? "Account Excluded"
                              : "Account Included",
                          });
                        }}
                      />
                      {customName ||
                      isHidden ||
                      isExcluded ||
                      settings[`invert_${account.id}`] === "true" ? (
                        <Action
                          title="Reset All Settings"
                          icon={Icon.ArrowCounterClockwise}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            await LocalStorage.removeItem(account.id);
                            await LocalStorage.removeItem(`hide_${account.id}`);
                            await LocalStorage.removeItem(
                              `exclude_${account.id}`,
                            );
                            await LocalStorage.removeItem(
                              `invert_${account.id}`,
                            );
                            setSettings((prev) => {
                              const next = { ...prev };
                              delete next[account.id];
                              delete next[`hide_${account.id}`];
                              delete next[`exclude_${account.id}`];
                              delete next[`invert_${account.id}`];
                              return next;
                            });
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Settings Reset",
                            });
                          }}
                        />
                      ) : null}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
