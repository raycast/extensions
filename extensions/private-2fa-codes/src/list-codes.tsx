import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import fs from "node:fs/promises";
import { useEffect, useState } from "react";
import {
  createManualTotpEntry,
  currentTotp,
  encodeTotpSecret,
  parseAuthenticatorExport,
  parseStoredEntries,
  serializeStoredEntries,
  type TotpEntry,
} from "./totp";

type Preferences = {
  revealCodes: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; entries: TotpEntry[] }
  | { status: "error"; message: string };

const STORAGE_KEY = "totp-entries";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
        const entries = parseStoredEntries(stored);

        if (!cancelled) {
          setState({ status: "loaded", entries });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load stored 2FA accounts.";
        if (!cancelled) {
          setState({ status: "error", message });
        }
        await showToast({ style: Toast.Style.Failure, title: "Could not load 2FA accounts", message });
      }
    }

    loadEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = state.status === "loading";
  const entries = state.status === "loaded" ? state.entries : [];

  async function persistEntries(nextEntries: TotpEntry[], successTitle: string) {
    try {
      await LocalStorage.setItem(STORAGE_KEY, serializeStoredEntries(nextEntries));
      setState({ status: "loaded", entries: nextEntries });
      await showToast({ style: Toast.Style.Success, title: successTitle });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not write Raycast local storage.";
      await showToast({ style: Toast.Style.Failure, title: "Could not save changes", message });
    }
  }

  async function handleAdd(entry: TotpEntry) {
    await persistEntries(sortEntries([...entries, entry]), "Account added");
  }

  async function handleEdit(original: TotpEntry, updated: TotpEntry) {
    await persistEntries(
      sortEntries(entries.map((entry) => (entry.id === original.id ? updated : entry))),
      "Account updated",
    );
  }

  async function handleDelete(entryToDelete: TotpEntry) {
    const accountName = entryToDelete.issuer ?? entryToDelete.label;
    const confirmed = await confirmAlert({
      title: `Delete ${accountName}?`,
      message: `Remove ${accountName} from Raycast localStorage`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });

    if (!confirmed) {
      return;
    }

    await persistEntries(
      entries.filter((entry) => entry.id !== entryToDelete.id),
      "Account deleted",
    );
  }

  async function handleImport(imported: TotpEntry[], mode: ImportMode) {
    const nextEntries = mode === "replace" ? imported : mergeEntries(entries, imported);
    await persistEntries(sortEntries(nextEntries), mode === "replace" ? "Accounts imported" : "Accounts merged");
  }

  if (state.status === "error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load codes"
          description={state.message}
          actions={
            <ActionPanel>
              <AddAccountAction onAdd={handleAdd} />
              <ImportAccountsAction onImport={handleImport} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search accounts"
      actions={
        <ActionPanel>
          <AddAccountAction onAdd={handleAdd} />
          <ImportAccountsAction onImport={handleImport} />
        </ActionPanel>
      }
    >
      {entries.map((entry) => {
        const code = currentTotp(entry, now);
        const displayCode = preferences.revealCodes ? formatCode(code.code) : "Hidden";

        return (
          <List.Item
            key={entry.id}
            title={entry.issuer ?? entry.label}
            subtitle={entry.account}
            accessories={[
              { text: displayCode, tooltip: preferences.revealCodes ? "Current code" : "Code hidden" },
              { tag: { value: `${code.remainingSeconds}s`, color: remainingColor(code.remainingSeconds, entry.period) } },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${escapeMarkdown(entry.label)}\n\nCurrent code: \`${formatCode(code.code)}\`\n\nRefreshes in **${code.remainingSeconds}s**.`}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Code"
                    content={code.code}
                    concealed
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard title="Copy Account Name" content={entry.issuer ?? entry.label} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <EditAccountAction entry={entry} onEdit={handleEdit} />
                  <AddAccountAction onAdd={handleAdd} />
                  <ImportAccountsAction onImport={handleImport} />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Account"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(entry)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

type ImportMode = "merge" | "replace";

function AddAccountAction(props: { onAdd: (entry: TotpEntry) => Promise<void> }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Add Account"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AccountForm submitTitle="Add Account" onSubmit={props.onAdd} />}
    />
  );
}

function EditAccountAction(props: { entry: TotpEntry; onEdit: (original: TotpEntry, updated: TotpEntry) => Promise<void> }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Account"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={
        <AccountForm
          submitTitle="Save Account"
          entry={props.entry}
          onSubmit={(updated) => props.onEdit(props.entry, updated)}
        />
      }
    />
  );
}

function ImportAccountsAction(props: { onImport: (entries: TotpEntry[], mode: ImportMode) => Promise<void> }) {
  return (
    <Action.Push
      icon={Icon.Download}
      title="Import From File"
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      target={<ImportAccountsForm onImport={props.onImport} />}
    />
  );
}

function AccountForm(props: { submitTitle: string; entry?: TotpEntry; onSubmit: (entry: TotpEntry) => Promise<void> }) {
  const { pop } = useNavigation();
  const [secret, setSecret] = useState(props.entry ? encodeTotpSecret(props.entry) : "");
  const [isSecretVisible, setIsSecretVisible] = useState(false);

  async function handleSubmit(values: { name: string; secret: string }) {
    try {
      const entry = createManualTotpEntry(values);
      await props.onSubmit(entry);
      pop();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save account.";
      await showToast({ style: Toast.Style.Failure, title: "Invalid account", message });
      return false;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title={props.submitTitle} onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={isSecretVisible ? Icon.EyeDisabled : Icon.Eye}
              title={isSecretVisible ? "Hide Secret" : "Show Secret"}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => setIsSecretVisible((visible) => !visible)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={props.entry?.issuer ?? props.entry?.label} />
      {isSecretVisible ? (
        <Form.TextField id="secret" title="Secret" value={secret} onChange={setSecret} />
      ) : (
        <Form.PasswordField id="secret" title="Secret" value={secret} onChange={setSecret} />
      )}
    </Form>
  );
}

function ImportAccountsForm(props: { onImport: (entries: TotpEntry[], mode: ImportMode) => Promise<void> }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { files: string[]; mode: ImportMode }) {
    try {
      const file = values.files[0];
      if (!file) {
        throw new Error("Choose an authenticator export file.");
      }

      const contents = await fs.readFile(file, "utf8");
      const entries = parseAuthenticatorExport(contents);
      await props.onImport(entries, values.mode);
      pop();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import accounts.";
      await showToast({ style: Toast.Style.Failure, title: "Import failed", message });
      return false;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Accounts" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Export File" allowMultipleSelection={false} />
      <Form.Dropdown id="mode" title="Import Mode" defaultValue="merge">
        <Form.Dropdown.Item value="merge" title="Merge With Existing Accounts" />
        <Form.Dropdown.Item value="replace" title="Replace Existing Accounts" />
      </Form.Dropdown>
    </Form>
  );
}

function sortEntries(entries: TotpEntry[]): TotpEntry[] {
  return [...entries].sort((a, b) => (a.issuer ?? a.label).localeCompare(b.issuer ?? b.label));
}

function mergeEntries(existing: TotpEntry[], imported: TotpEntry[]): TotpEntry[] {
  return Array.from(new Map([...existing, ...imported].map((entry) => [entry.id, entry])).values());
}

function formatCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }

  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }

  return code;
}

function remainingColor(remainingSeconds: number, period: number): Color {
  const ratio = remainingSeconds / period;

  if (ratio <= 0.2) {
    return Color.Red;
  }

  if (ratio <= 0.4) {
    return Color.Orange;
  }

  return Color.Green;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}
