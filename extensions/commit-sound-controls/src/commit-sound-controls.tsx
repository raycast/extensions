import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { AccountForm } from "./account-form";
import { ConnectGitHubAccount } from "./connect-github-account";
import {
  CommitSoundAccount,
  getState,
  installOrRepairHook,
  InstallationState,
  playSound,
  removeConnectedGitHubAccount,
  removeManagedAudio,
  selectConnectedGitHubAccount,
  supportDirectory,
  writeConfig,
} from "./lib/commit-sounds";
import { signOutGitHubAccount } from "./lib/github-oauth";

export default function CommitSoundControls() {
  const [state, setState] = useState<InstallationState>();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setState(await getState());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (
      title: string,
      operation: () => Promise<void>,
      successMessage: string,
    ) => {
      const toast = await showToast({ style: Toast.Style.Animated, title });
      try {
        await operation();
        toast.style = Toast.Style.Success;
        toast.title = successMessage;
        await refresh();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update commit sounds";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [refresh],
  );

  const saveAccount = useCallback(
    async (account: CommitSoundAccount) => {
      const config = state?.config;
      if (!config) return;
      const replacedAccounts = config.accounts.filter(
        (item) => item.id === account.id || item.owner === account.owner,
      );
      await installOrRepairHook();
      await Promise.all(
        replacedAccounts
          .filter((item) => item.soundPath !== account.soundPath)
          .map(removeManagedAudio),
      );
      await writeConfig({
        ...config,
        enabled: true,
        accounts: [
          ...config.accounts.filter(
            (item) => item.id !== account.id && item.owner !== account.owner,
          ),
          account,
        ],
      });
      await refresh();
    },
    [refresh, state?.config],
  );

  const removeAccount = useCallback(
    async (account: CommitSoundAccount) => {
      const config = state?.config;
      if (!config) return;
      await removeManagedAudio(account);
      await writeConfig({
        ...config,
        accounts: config.accounts.filter((item) => item.id !== account.id),
      });
    },
    [state?.config],
  );

  const installed = state?.hookInstalled ?? false;
  const enabled = state?.config.enabled ?? false;
  const accounts = state?.config.accounts ?? [];
  const connectedGitHubAccount = state?.config.connectedGitHubAccount;
  const connectedGitHubAccounts = state?.config.connectedGitHubAccounts ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Commit Sounds"
      searchBarPlaceholder="Search commit sound controls"
    >
      <List.Section title="Status">
        <List.Item
          icon={{
            source:
              installed && enabled ? Icon.CheckCircle : Icon.ExclamationMark,
            tintColor: installed && enabled ? Color.Green : Color.Orange,
          }}
          title={
            installed
              ? enabled
                ? "Commit sounds are enabled"
                : "Commit sounds are disabled"
              : "Global hook is not installed"
          }
          subtitle={
            installed
              ? `${accounts.length} GitHub account ${accounts.length === 1 ? "rule" : "rules"} configured`
              : "Install the hook to activate commit sounds."
          }
          actions={
            <ActionPanel>
              {installed && enabled ? (
                <Action
                  title="Disable Commit Sounds"
                  icon={Icon.XMarkCircle}
                  onAction={() =>
                    run(
                      "Disabling commit sounds",
                      async () => {
                        if (!state) return;
                        await writeConfig({ ...state.config, enabled: false });
                      },
                      "Commit sounds disabled",
                    )
                  }
                />
              ) : (
                <Action
                  title={
                    installed
                      ? "Enable Commit Sounds"
                      : "Install and Enable Commit Sounds"
                  }
                  icon={Icon.CheckCircle}
                  onAction={() =>
                    run(
                      installed
                        ? "Enabling commit sounds"
                        : "Installing global Git hook",
                      async () => {
                        if (!state) return;
                        if (!installed) await installOrRepairHook();
                        await writeConfig({ ...state.config, enabled: true });
                      },
                      installed
                        ? "Commit sounds enabled"
                        : "Global Git hook installed and enabled",
                    )
                  }
                />
              )}
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
        {state?.conflictingHookPath && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Another global hooks path is configured"
            subtitle={state.conflictingHookPath}
            accessories={[{ text: "Install is blocked to protect it" }]}
          />
        )}
      </List.Section>

      <List.Section title="Connected GitHub Accounts">
        <List.Item
          icon={Icon.PersonPlus}
          title="Connect Another GitHub Account"
          subtitle="Adds a separate OAuth session; existing rules stay untouched."
          actions={
            <ActionPanel>
              <Action.Push
                title="Connect Another GitHub Account"
                icon={Icon.PersonPlus}
                target={<ConnectGitHubAccount onConnected={refresh} />}
              />
            </ActionPanel>
          }
        />
        {connectedGitHubAccounts.length === 0 ? (
          <List.Item
            icon={Icon.Person}
            title="No GitHub account connected"
            subtitle="Optional: connect one to prefill a new sound rule. You can still add any owner manually."
          />
        ) : (
          connectedGitHubAccounts.map((account) => {
            const isDefault = account.login === connectedGitHubAccount;
            return (
              <List.Item
                key={account.tokenSlot}
                icon={{
                  source: isDefault ? Icon.PersonCircle : Icon.Person,
                  tintColor: isDefault ? Color.Green : undefined,
                }}
                title={account.login}
                subtitle={
                  isDefault
                    ? "Default owner for new sound rules"
                    : "Connected GitHub account"
                }
                accessories={isDefault ? [{ text: "Default" }] : []}
                actions={
                  <ActionPanel>
                    {!isDefault && (
                      <Action
                        title="Make Default Owner"
                        icon={Icon.Star}
                        onAction={() =>
                          run(
                            `Making ${account.login} the default`,
                            () => selectConnectedGitHubAccount(account.login),
                            `${account.login} is the default owner`,
                          )
                        }
                      />
                    )}
                    <Action.OpenInBrowser
                      title="Manage GitHub Account in Browser"
                      url="https://github.com/login"
                      icon={Icon.Globe}
                    />
                    <Action
                      title="Disconnect GitHub Account"
                      icon={Icon.Logout}
                      style={Action.Style.Destructive}
                      onAction={() =>
                        run(
                          `Signing out ${account.login}`,
                          async () => {
                            await signOutGitHubAccount(account.tokenSlot);
                            await removeConnectedGitHubAccount(account.login);
                          },
                          `${account.login} disconnected`,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>

      <List.Section title="GitHub Sound Rules">
        {accounts.length === 0 && (
          <List.Item
            icon={{ source: Icon.Sparkles, tintColor: Color.Purple }}
            title="Create your first sound rule"
            subtitle="Add a GitHub owner, choose an audio file or link, then set its volume."
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create First Sound Rule"
                  target={
                    <AccountForm
                      defaultOwner={connectedGitHubAccount}
                      onSaved={saveAccount}
                    />
                  }
                  icon={Icon.PlusCircle}
                />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          icon={Icon.PlusCircle}
          title="Add GitHub Account Rule"
          subtitle="Add another GitHub user or organization, then choose its sound and volume."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add GitHub Account Rule"
                target={
                  <AccountForm
                    defaultOwner={connectedGitHubAccount}
                    onSaved={saveAccount}
                  />
                }
                icon={Icon.PlusCircle}
              />
            </ActionPanel>
          }
        />
        {accounts.map((account) => {
          const missing = state?.missingSoundIds.includes(account.id) ?? false;
          return (
            <List.Item
              key={account.id}
              icon={{
                source: missing ? Icon.XMarkCircle : Icon.Music,
                tintColor: missing ? Color.Red : Color.Purple,
              }}
              title={account.owner}
              subtitle={account.source}
              accessories={[
                { text: `${Math.round(account.volume * 100)}%` },
                { text: missing ? "File missing" : "Ready" },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Test Sound"
                    icon={Icon.Play}
                    onAction={() =>
                      run(
                        `Playing ${account.owner}`,
                        () => playSound(account.soundPath, account.volume),
                        "Sound played",
                      )
                    }
                  />
                  <Action.Push
                    title="Replace Sound or Volume"
                    target={
                      <AccountForm account={account} onSaved={saveAccount} />
                    }
                    icon={Icon.Pencil}
                  />
                  <Action.ShowInFinder
                    path={account.soundPath}
                    title="Show Audio File"
                  />
                  <Action
                    title="Remove Account Rule"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      run(
                        `Removing ${account.owner}`,
                        () => removeAccount(account),
                        "Account rule removed",
                      )
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Maintenance">
        <List.Item
          icon={Icon.WrenchScrewdriver}
          title="Install or Repair Global Hook"
          subtitle="Uses Git's global hooks path and will not overwrite another hook setup."
          actions={
            <ActionPanel>
              <Action
                title="Install or Repair Global Hook"
                icon={Icon.WrenchScrewdriver}
                onAction={() =>
                  run(
                    "Installing global Git hook",
                    installOrRepairHook,
                    "Global Git hook installed",
                  )
                }
              />
              <Action.ShowInFinder
                path={supportDirectory}
                title="Open Support Folder"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
