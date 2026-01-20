import { List, ActionPanel, Action, Icon, confirmAlert, Alert, Color, Clipboard, showToast, Toast } from "@raycast/api";
import { useCachedState, getFavicon } from "@raycast/utils";
import { performAutoFill } from "./utils";
import { Account } from "./types";
import AccountForm from "./account-form";

export default function Command() {
  const [accounts, setAccounts] = useCachedState<Account[]>("stored-accounts", []);
  const [pinnedIds, setPinnedIds] = useCachedState<string[]>("pinned-accounts", []);

  const existingProjects = Array.from(new Set(accounts.map((a) => a.project))).filter(Boolean);
  const existingEnvironments = Array.from(new Set(accounts.map((a) => a.environment))).filter(Boolean);

  const handleAddAccount = (newAccount: Account) => {
    setAccounts((prev) => [...prev, newAccount]);
  };

  const handleEditAccount = (updatedAccount: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
  };

  const handleDeleteAccount = async (id: string) => {
    if (
      await confirmAlert({
        title: "Delete Account?",
        message: "This action cannot be undone.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setPinnedIds((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const handleExport = async () => {
    await Clipboard.copy(JSON.stringify(accounts, null, 2));
    await showToast(Toast.Style.Success, "Exported to Clipboard");
  };

  const handleImport = async () => {
    try {
      const text = await Clipboard.readText();
      if (!text) {
        await showToast(Toast.Style.Failure, "Clipboard is empty");
        return;
      }
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) {
        throw new Error("Invalid format");
      }

      if (
        await confirmAlert({
          title: "Import Accounts",
          message: `Found ${imported.length} accounts. Import new ones?`,
          primaryAction: { title: "Import", style: Alert.ActionStyle.Destructive },
        })
      ) {
        const existingIds = new Set(accounts.map((a) => a.id));
        const processedImports: Account[] = [];

        for (const rawAcc of imported) {
          const acc = { ...rawAcc };
          if (!acc.id) {
            acc.id = Math.random().toString(36).substring(2, 15);
          }

          if (existingIds.has(acc.id)) {
            continue;
          }

          processedImports.push(acc as Account);
        }

        if (processedImports.length > 0) {
          setAccounts((prev) => [...prev, ...processedImports]);
          await showToast(Toast.Style.Success, `Imported ${processedImports.length} accounts`);
        } else {
          await showToast(Toast.Style.Failure, "No new accounts to import");
        }
      }
    } catch {
      await showToast(Toast.Style.Failure, "Failed to import", "Invalid JSON format");
    }
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const pinnedAccounts = accounts.filter((a) => pinnedIds.includes(a.id));
  const otherAccounts = accounts.filter((a) => !pinnedIds.includes(a.id));
  const projects = [...new Set(otherAccounts.map((a) => a.project))];

  const CreateAction = () => (
    <Action.Push
      title="Add New Account"
      target={
        <AccountForm
          existingProjects={existingProjects}
          existingEnvironments={existingEnvironments}
          onSubmit={handleAddAccount}
        />
      }
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );

  const DataActions = () => (
    <ActionPanel.Section title="Data Management">
      <Action title="Export Accounts JSON" icon={Icon.Download} onAction={handleExport} />
      <Action title="Import Accounts JSON" icon={Icon.Upload} onAction={handleImport} />
    </ActionPanel.Section>
  );

  if (accounts.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="No Accounts Found"
          description="Press Enter to add your first account"
          actions={
            <ActionPanel>
              <CreateAction />
              <DataActions />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search role, username, or notes..." isShowingDetail>
      {pinnedAccounts.length > 0 && (
        <List.Section title="Pinned">
          {pinnedAccounts.map((account) => (
            <AccountItem
              key={account.id}
              account={account}
              isPinned={true}
              existingProjects={existingProjects}
              existingEnvironments={existingEnvironments}
              onTogglePin={() => togglePin(account.id)}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
              CreateAction={CreateAction}
              DataActions={DataActions}
            />
          ))}
        </List.Section>
      )}

      {projects.map((project) => (
        <List.Section key={project} title={project}>
          {otherAccounts
            .filter((a) => a.project === project)
            .map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                isPinned={false}
                existingProjects={existingProjects}
                existingEnvironments={existingEnvironments}
                onTogglePin={() => togglePin(account.id)}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                CreateAction={CreateAction}
                DataActions={DataActions}
              />
            ))}
        </List.Section>
      ))}

      <List.Section title="Actions">
        <List.Item
          title="Add New Account..."
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <CreateAction />
              <DataActions />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function getEnvironmentColor(env: string) {
  const lowerEnv = env.toLowerCase();
  if (lowerEnv.includes("prod")) return Color.Red;
  if (lowerEnv.includes("staging") || lowerEnv.includes("uat")) return Color.Orange;
  if (lowerEnv.includes("dev") || lowerEnv.includes("test")) return Color.Green;
  if (lowerEnv.includes("local")) return Color.Blue;
  return Color.SecondaryText;
}

function AccountItem({
  account,
  isPinned,
  existingProjects,
  existingEnvironments,
  onTogglePin,
  onEdit,
  onDelete,
  CreateAction,
  DataActions,
}: {
  account: Account;
  isPinned: boolean;
  existingProjects: string[];
  existingEnvironments: string[];
  onTogglePin: () => void;
  onEdit: (a: Account) => void;
  onDelete: (id: string) => void;
  CreateAction: React.ComponentType;
  DataActions: React.ComponentType;
}) {
  const envColor = getEnvironmentColor(account.environment);

  return (
    <List.Item
      // 如果有 URL 就抓 Favicon，否則用預設圖示
      icon={account.url ? getFavicon(account.url) : Icon.Person}
      title={account.role}
      // 在列表右側顯示帶顏色的環境標籤，並加入 tooltip 防止過長被截斷
      accessories={[
        {
          tag: { value: account.environment, color: envColor },
          tooltip: account.environment,
        },
      ]}
      keywords={[
        account.role,
        account.username,
        account.project,
        account.environment,
        account.url || "",
        account.notes || "",
      ]}
      detail={
        <List.Item.Detail
          markdown={`# ${account.role}\n---\n**Username**: \n\`${account.username}\` \n\n${account.password ? `**Password**: \n\`••••••••\`` : ""} \n\n### Notes\n${account.notes || "No notes provided"}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Project" text={account.project} />
              <List.Item.Detail.Metadata.TagList title="Environment">
                <List.Item.Detail.Metadata.TagList.Item text={account.environment} color={envColor} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Link title="Link" target={account.url || ""} text={account.url || "Not set"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Automation">
            <Action title="Auto-Fill" icon={Icon.Bolt} onAction={() => performAutoFill(account)} />
            <Action
              title={isPinned ? "Unpin Account" : "Pin Account"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={onTogglePin}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Management">
            <Action.Push
              title="Edit Account"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                <AccountForm
                  account={account}
                  existingProjects={existingProjects}
                  existingEnvironments={existingEnvironments}
                  onSubmit={onEdit}
                />
              }
            />
            <CreateAction />
            <Action
              title="Delete Account"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              style={Action.Style.Destructive}
              onAction={() => onDelete(account.id)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manual Operations">
            <Action.Paste title="Paste Username" content={account.username} icon={Icon.Person} />
            {account.password && (
              <Action.Paste
                title="Paste Password"
                content={account.password}
                icon={Icon.Lock}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            <Action.CopyToClipboard title="Copy Username" content={account.username} />
            {account.password && <Action.CopyToClipboard title="Copy Password" content={account.password} />}

            {account.url && (
              <Action.OpenInBrowser
                title="Open URL Only"
                url={account.url}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>

          <DataActions />
        </ActionPanel>
      }
    />
  );
}
