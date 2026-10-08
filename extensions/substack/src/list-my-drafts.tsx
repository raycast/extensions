import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, open } from "@raycast/api";

import type { DraftReference } from "@/lib/createDraft";

import useAccounts from "@/hooks/useAccounts";
import useDrafts from "@/hooks/useDrafts";

import AccountSelector from "@/components/AccountSelector";
import AccountSetup from "@/components/AccountSetup";
import CreateDraftForm from "@/components/CreateDraftForm";
import EditDraftForm from "@/components/EditDraftForm";

export default function ListMyDrafts() {
  const { accounts, selectedId, setSelectedId, isLoading, error, reload } = useAccounts();
  const account = accounts.find((a) => a.id === selectedId);
  const {
    drafts,
    recovery,
    nextOffset,
    isLoading: loadingDrafts,
    error: draftError,
    refresh,
    loadMore,
  } = useDrafts(account);
  if (error || (!isLoading && !accounts.length))
    return (
      <AccountSetup
        message={error ?? "Open Create Draft to import legacy preferences, or add a connection in Manage Accounts."}
        onRefresh={() => {
          void reload();
        }}
      />
    );
  const create = (
    <Action.Push
      title="Create Draft"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateDraftForm accounts={accounts} accountId={selectedId} onAccountChange={setSelectedId} />}
      onPop={() => {
        void refresh();
      }}
    />
  );
  const actions = (
    <ActionPanel>
      {create}
      <Action title="Refresh Drafts" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={refresh} />
      <Action title="Refresh Accounts" onAction={reload} />
    </ActionPanel>
  );
  const openDraft = (draft: DraftReference) => (
    <Action
      title="Open Draft in Substack"
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={() => open(draft.editorUrl)}
    />
  );
  const edit = (draft: DraftReference) => (
    <Action.Push
      title="Edit Draft"
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={<EditDraftForm accountId={selectedId} draftId={draft.id} editorUrl={draft.editorUrl} />}
      onPop={() => {
        void refresh();
      }}
    />
  );
  return (
    <List
      navigationTitle="My Substack Drafts"
      isLoading={isLoading || loadingDrafts}
      searchBarPlaceholder="Search unpublished drafts"
      searchBarAccessory={<AccountSelector accounts={accounts} value={selectedId} onChange={setSelectedId} />}
      actions={actions}
      pagination={{ hasMore: nextOffset !== undefined, onLoadMore: loadMore, pageSize: 25 }}
    >
      <List.EmptyView
        title={!selectedId ? "Select an account" : draftError ? "Could not load drafts" : "No unpublished drafts"}
        description={draftError}
        actions={actions}
      />
      {draftError && <List.Item title="Could not refresh drafts" subtitle={draftError} actions={actions} />}
      <List.Section title="Unpublished drafts">
        {drafts.map((d) => (
          <List.Item
            key={d.id}
            title={d.title}
            subtitle={d.subtitle}
            accessories={recovery.some((r) => r.id === d.id && !r.verified) ? [{ text: "Needs Review" }] : []}
            actions={
              <ActionPanel>
                {openDraft(d)}
                {edit(d)}
                {create}
                <Action title="Refresh Drafts" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={refresh} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Saved recovery links">
        {recovery
          .filter((r) => !drafts.some((d) => d.id === r.id))
          .map((r) => (
            <List.Item
              key={r.id}
              title={r.title}
              icon={r.verified ? Icon.Document : Icon.ExclamationMark}
              accessories={[{ text: r.verified ? "Saved recovery link" : "Needs Review" }]}
              actions={
                <ActionPanel>
                  {openDraft(r)}
                  {edit(r)}
                  {create}
                  <Action
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    title="Copy Draft URL"
                    onAction={() => Clipboard.copy(r.editorUrl)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
