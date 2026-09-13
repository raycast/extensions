import { Form, Image, List } from "@raycast/api";

import { entryKey, WorkspaceEntry } from "../api/workspaces";

import { useWorkspaces } from "./WorkspaceContext";

function entryTitle(entry: WorkspaceEntry, entries: WorkspaceEntry[], needsReauth: string[]): string {
  // Two entries can share an orgName/orgId across accounts (D10) — disambiguate with the email.
  const duplicated = entries.filter((w) => w.orgId === entry.orgId).length > 1;
  const base = duplicated ? `${entry.orgName} (${entry.userEmail})` : entry.orgName;
  // §4.2: a token-less entry is visible as needing re-auth from ordinary command UI too.
  return needsReauth.includes(entryKey(entry)) ? `${base} — needs re-authentication` : base;
}

const workspaceIcon: Image.ImageLike = "linear-app-icon.png";

// P1: sole searchBarAccessory for list commands with a free search bar.
export function WorkspaceListDropdown() {
  const { entries, activeEntry, showSwitcher, needsReauth, switchWorkspace } = useWorkspaces();
  if (!showSwitcher || !activeEntry) return null;
  return (
    <List.Dropdown tooltip="Change Workspace (⌘P)" value={entryKey(activeEntry)} onChange={switchWorkspace}>
      {entries.map((w) => (
        <List.Dropdown.Item
          key={entryKey(w)}
          value={entryKey(w)}
          title={entryTitle(w, entries, needsReauth)}
          icon={workspaceIcon}
        />
      ))}
    </List.Dropdown>
  );
}

// P1b: prepended section inside an EXISTING dropdown; values namespaced "ws:" so they
// can never collide with the host dropdown's own values (DocumentList precedent).
export const WORKSPACE_VALUE_PREFIX = "ws:";

export function isWorkspaceDropdownValue(value: string): boolean {
  return value.startsWith(WORKSPACE_VALUE_PREFIX);
}

export function workspaceValueToKey(value: string): string {
  return value.slice(WORKSPACE_VALUE_PREFIX.length);
}

export function WorkspaceDropdownSection() {
  const { entries, activeEntry, showSwitcher, needsReauth } = useWorkspaces();
  if (!showSwitcher) return null;
  return (
    <List.Dropdown.Section title="Workspace">
      {entries.map((w) => {
        // S9-safe: selecting the current row still routes through switchWorkspace, which
        // no-ops when the key already matches the active entry.
        const isCurrent = activeEntry !== null && entryKey(w) === entryKey(activeEntry);
        return (
          <List.Dropdown.Item
            key={`${WORKSPACE_VALUE_PREFIX}${entryKey(w)}`}
            value={`${WORKSPACE_VALUE_PREFIX}${entryKey(w)}`}
            title={
              isCurrent
                ? `✓ ${entryTitle(w, entries, needsReauth)} — current`
                : `Switch to ${entryTitle(w, entries, needsReauth)}`
            }
            icon={workspaceIcon}
          />
        );
      })}
    </List.Dropdown.Section>
  );
}

// P2: first form field, above Team. Changing it sets the global default and the form
// resets downstream fields (the remount boundary in WorkspaceProvider does the reset).
// The item id is "workspaceKey" so Raycast drafts capture the value under
// draftValues.workspaceKey (D7) — the field is controlled from context, not useForm.
export function WorkspaceFormDropdown(props: { autoFocus?: boolean }) {
  const { entries, activeEntry, showSwitcher, needsReauth, switchWorkspace } = useWorkspaces();
  if (!showSwitcher || !activeEntry) return null;
  return (
    <Form.Dropdown
      id="workspaceKey"
      title="Workspace"
      value={entryKey(activeEntry)}
      onChange={switchWorkspace}
      autoFocus={props.autoFocus}
    >
      {entries.map((w) => (
        <Form.Dropdown.Item
          key={entryKey(w)}
          value={entryKey(w)}
          title={entryTitle(w, entries, needsReauth)}
          icon={workspaceIcon}
        />
      ))}
    </Form.Dropdown>
  );
}
