import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { homedir } from "node:os";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useCallback, useEffect, useState } from "react";
import { DestructiveAction, PinAction, PrimaryAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import Ask from "./ask";
import { CLAUDE_ICON } from "./constants";
import { useRecents } from "./hooks/useRecents";
import type { Conversation } from "./type";
import { exportConversationsToJson } from "./utils/historyExport";
import { resolveToast } from "./utils/toast";
import { RecentsListView } from "./views/recents-list";
import { RenameForm } from "./views/recents/rename-form";

type StatusFilter = "active" | "archived" | "all";

const STATUS_FILTER_KEY = "recents_status_filter";
const DEFAULT_STATUS_FILTER: StatusFilter = "active";

function isStatusFilter(value: unknown): value is StatusFilter {
  return value === "active" || value === "archived" || value === "all";
}

/**
 * Owns the Status filter's persistence directly through `LocalStorage`, rather than
 * `List.Dropdown`'s own `storeValue`. `storeValue` restores what the dropdown VISUALLY
 * shows on the next mount, but does not fire `onChange` for that restore — so a
 * `status` React state seeded with a fixed initial value (e.g. always "active") drifts
 * from what the dropdown displays the moment `storeValue` silently restores a different
 * item. That drift is exactly a UI lying about its own state: the list stays filtered to
 * the stale `status` while the dropdown shows the persisted one.
 *
 * Making the dropdown a CONTROLLED component (`value={status}`, no `storeValue`) and
 * having this hook read/write the same value it hands to `value` closes that gap: there
 * is exactly one source of truth (`status`), and both the displayed dropdown value and
 * the list's filtering logic are driven from it every render, never independently.
 */
function useStatusFilter(): { status: StatusFilter; isLoading: boolean; setStatus: (next: StatusFilter) => void } {
  const [status, setStatusState] = useState<StatusFilter>(DEFAULT_STATUS_FILTER);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(STATUS_FILTER_KEY);
      if (isStatusFilter(stored)) {
        setStatusState(stored);
      }
      setLoading(false);
    })();
    // Runs once per mount, matching every other collection/hook load effect in this
    // codebase — there is nothing else this depends on.
  }, []);

  const setStatus = useCallback((next: StatusFilter) => {
    setStatusState(next);
    // Fire-and-forget: the dropdown's displayed value already changed via `setStatusState`
    // above (that's the single source of truth), this write is purely so the NEXT mount's
    // `useEffect` read picks up the choice. Losing this write in a rare failure case just
    // means the next mount falls back to `DEFAULT_STATUS_FILTER` — not a correctness or
    // data-loss concern the way the collection stores' writes are.
    LocalStorage.setItem(STATUS_FILTER_KEY, next);
  }, []);

  return { status, isLoading, setStatus };
}

export default function Recents() {
  const recents = useRecents();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { status, isLoading: isStatusLoading, setStatus } = useStatusFilter();

  /**
   * Writes EVERY conversation — regardless of the Status filter currently applied to the
   * list — to a timestamped JSON file in Downloads, mirroring `src/model.tsx`'s preset
   * export (same location convention, same toast shape, same "Show in Finder" primary
   * action on success). Scoped to all conversations deliberately: the point of this
   * feature is not losing data, and an export that silently omits archived conversations
   * because the dropdown happened to be set to "Active" would be exactly the kind of
   * quiet data loss Export History exists to prevent.
   *
   * Sources from `recents.data` — the same in-memory state Recents renders from — so the
   * export can never disagree with what's on screen. Pure read: never calls
   * `recents.update`/`remove`/`clear`, so it cannot mutate `recents_v1` or any legacy key.
   *
   * Fires the "Exporting…" toast BEFORE the write begins (not after) — a large history
   * writing to disk is exactly the kind of operation that must not go silent while it runs.
   */
  const exportHistory = async () => {
    const toast = await showToast({ title: "Exporting history...", style: Toast.Style.Animated });
    if (recents.data.length === 0) {
      // Hide-and-reshow rather than mutating the live toast — see `src/utils/toast.ts`.
      await resolveToast(toast, {
        style: Toast.Style.Failure,
        title: "Nothing to export",
        message: "You have no conversations yet.",
      });
      return;
    }
    try {
      const json = exportConversationsToJson(recents.data);
      const filePath = join(
        homedir(),
        "Downloads",
        `claude-history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      );
      await writeFile(filePath, json, "utf-8");
      await resolveToast(toast, {
        style: Toast.Style.Success,
        title: "History exported",
        message: filePath,
        primaryAction: {
          title: "Show in Finder",
          onAction: async () => {
            await showInFinder(filePath);
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await resolveToast(toast, {
        style: Toast.Style.Failure,
        title: "Export failed",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: async () => {
            await Clipboard.copy(message);
          },
        },
      });
    }
  };

  const exportHistoryAction = (
    <Action
      title="Export History to JSON"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
      onAction={exportHistory}
    />
  );

  /**
   * The recovery export, offered ONLY from the empty state — the one moment the normal
   * export is worthless and the user most needs their data.
   *
   * `Export History to JSON` reads `recents.data`, so when Recents renders empty it has
   * nothing to write. But "Recents is empty" and "the user has no data" are different
   * facts: a migration that did not run, a partially-parsed legacy value rescued to a
   * `__corrupt_` side key, or legacy keys that were never retired all present as an empty
   * list with the data still sitting in storage, unreachable from the UI. This writes the
   * extension's whole LocalStorage verbatim so that data is recoverable by hand.
   *
   * No preference is included — the API key lives in Raycast's preference store, not here
   * — and the `apiKey` guard below is belt-and-braces against a future write of one.
   */
  const exportRawStorage = async () => {
    const toast = await showToast({ title: "Exporting stored data...", style: Toast.Style.Animated });
    try {
      const all = await LocalStorage.allItems();
      const items = Object.fromEntries(Object.entries(all).filter(([key]) => !/apikey|token|secret/i.test(key)));
      if (Object.keys(items).length === 0) {
        await resolveToast(toast, {
          style: Toast.Style.Failure,
          title: "Nothing stored",
          message: "This extension has no saved data to export.",
        });
        return;
      }
      const filePath = join(
        homedir(),
        "Downloads",
        `claude-storage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      );
      await writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
      await resolveToast(toast, {
        style: Toast.Style.Success,
        title: `Exported ${Object.keys(items).length} stored ${Object.keys(items).length === 1 ? "key" : "keys"}`,
        message: filePath,
        primaryAction: {
          title: "Show in Finder",
          onAction: async () => {
            await showInFinder(filePath);
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await resolveToast(toast, {
        style: Toast.Style.Failure,
        title: "Export failed",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: async () => {
            await Clipboard.copy(message);
          },
        },
      });
    }
  };

  const exportRawStorageAction = (
    <Action
      title="Export Stored Data to JSON"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
      onAction={exportRawStorage}
    />
  );

  const uniqueConversations = recents.data.filter(
    (value, index, self) => index === self.findIndex((conversation) => conversation.id === value.id),
  );

  const statusFiltered = uniqueConversations.filter((conversation) => {
    if (status === "all") return true;
    if (status === "archived") return !!conversation.archived;
    return !conversation.archived;
  });

  const searchFiltered = searchText
    ? statusFiltered.filter((x) =>
        // `?? []`, matching `recents-list.tsx`'s same defensive read — currently
        // unreachable in practice (`isWellFormedRow` in `recentsMigration.ts` guarantees
        // every row this store sees has a `chats` array), but that guarantee lives in a
        // different file and a future change to it shouldn't be able to turn this into a
        // crash here.
        (x.chats ?? []).some(
          (chat) =>
            chat.question.toLowerCase().includes(searchText.toLowerCase()) ||
            chat.answer.toLowerCase().includes(searchText.toLowerCase()),
        ),
      )
    : statusFiltered;

  // Pinned rows sort by pinned_at; the rest sort by updated_at, newest first (per the brief).
  const pinnedConversations = searchFiltered
    .filter((x) => !!x.pinned_at)
    .sort((a, b) => new Date(b.pinned_at ?? 0).getTime() - new Date(a.pinned_at ?? 0).getTime());

  const recentConversations = searchFiltered
    .filter((x) => !x.pinned_at)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const getActionPanel = (conversation: Conversation) => (
    <ActionPanel>
      <PrimaryAction
        title="Ask a Follow-up"
        onAction={() => push(<Ask conversation={conversation} />, recents.reload)}
      />
      <PinAction
        title={conversation.pinned_at ? "Unpin Conversation" : "Pin Conversation"}
        isPinned={!!conversation.pinned_at}
        onAction={() => {
          // Pin and Unpin are both TIMESTAMPED decisions, never a bare
          // presence/absence. `savedChats` keeps its `saved_at` forever (the migration
          // never writes to legacy keys), so every Recents mount re-derives a
          // `pinned_at` for a migrated conversation — clearing the field alone would be
          // undone before the user saw it. Writing `unpinned_at` is what makes "the user
          // deliberately unpinned this" outlive re-derivation; `reconcileRecents` takes
          // the later of the two. See the ownership invariant on `Conversation`.
          const now = new Date().toISOString();
          const isUnpinning = !!conversation.pinned_at;
          recents.update({
            ...conversation,
            pinned_at: isUnpinning ? undefined : now,
            unpinned_at: isUnpinning ? now : conversation.unpinned_at,
            pinned: !isUnpinning,
          });
        }}
      />
      <Action
        title={conversation.archived ? "Unarchive Conversation" : "Archive Conversation"}
        icon={Icon.Tray}
        onAction={() => recents.update({ ...conversation, archived: !conversation.archived })}
      />
      <Action
        title="Rename Conversation"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        onAction={() =>
          push(
            <RenameForm
              conversation={conversation}
              onSubmit={(title) => recents.update({ ...conversation, title: title || undefined })}
            />,
          )
        }
      />
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Delete"
          dialog={{
            title: "Are you sure you want to delete this conversation?",
            message: "This permanently deletes it everywhere, including your history and saved answers.",
            primaryButton: "Delete",
          }}
          onAction={() => recents.remove(conversation)}
        />
        <DestructiveAction
          title="Delete All"
          dialog={{
            title: "Are you sure you want to delete all your recents?",
            message:
              "This permanently deletes every conversation everywhere, including your history and saved answers.",
            primaryButton: "Delete All",
          }}
          onAction={() => recents.clear()}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Import / Export">{exportHistoryAction}</ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const statusDropdown = (
    // Controlled (`value`, no `storeValue`) — see `useStatusFilter`'s docstring for why:
    // `storeValue`'s silent restore-without-`onChange` is exactly the "displayed value
    // and filtering state can drift" defect this replaces.
    <List.Dropdown tooltip="Status" value={status} onChange={(value) => setStatus(value as StatusFilter)}>
      <List.Dropdown.Item title="Active" value="active" />
      <List.Dropdown.Item title="Archived" value="archived" />
      <List.Dropdown.Item title="All" value="all" />
    </List.Dropdown>
  );

  return (
    <List
      isShowingDetail={false}
      isLoading={recents.isLoading || isStatusLoading}
      filtering={false}
      throttle={false}
      navigationTitle={"Recents"}
      selectedItemId={selectedConversationId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedConversationId) {
          setSelectedConversationId(id);
        }
      }}
      searchBarPlaceholder="Search recents..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={statusDropdown}
    >
      {recents.data.length === 0 ? (
        <List.EmptyView
          title="No Recents Yet"
          description="Start one and it will show up here."
          icon={CLAUDE_ICON}
          actions={
            <ActionPanel>
              <Action
                title="Start New Conversation"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<Ask />, recents.reload)}
              />
              {/* The recovery path: if this list is empty but storage is not, this is the
                  only way to get at the data without a Raycast dev build. */}
              <ActionPanel.Section title="Import / Export">{exportRawStorageAction}</ActionPanel.Section>
              <PreferencesActionSection />
            </ActionPanel>
          }
        />
      ) : searchFiltered.length === 0 ? (
        <List.EmptyView
          title="No Matching Recents"
          description={`Nothing matches "${searchText}".`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Clear Search" icon={Icon.XMarkCircle} onAction={() => setSearchText("")} />
              <Action
                title="Start New Conversation"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<Ask />, recents.reload)}
              />
              <ActionPanel.Section title="Import / Export">{exportHistoryAction}</ActionPanel.Section>
              <PreferencesActionSection />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {pinnedConversations.length > 0 && (
            <RecentsListView
              title="Pinned"
              conversations={pinnedConversations}
              selectedConversation={selectedConversationId}
              actionPanel={getActionPanel}
            />
          )}
          {recentConversations.length > 0 && (
            <RecentsListView
              title="Recent"
              conversations={recentConversations}
              selectedConversation={selectedConversationId}
              actionPanel={getActionPanel}
            />
          )}
        </>
      )}
    </List>
  );
}
