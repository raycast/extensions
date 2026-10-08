import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDeeplink, useCachedPromise } from "@raycast/utils";
import {
  bridgeErrorReason,
  deletesPermanently,
  fetchEmails,
  findArchiveFolder,
  holdConnections,
  holdsEverything,
} from "./imap-client";
import { BackAction, childFolders, folderDisplayName, FolderListItem, useFolders } from "./folders";
import { copyEmailAsMarkdown, EmailContext, EmailUpdate, ManageActions, RespondActions } from "./email-actions";
import { EmailDetail, ExpandedEmailView } from "./email-view";
import { isRead, withRead } from "./email-format";
import { openOriginalInBrowser } from "./open-original";
import { BridgeErrorView } from "./bridge-error";
import { ComposeForm } from "./compose-form";
import { anonymizeEmail } from "./demo";
import { Email, EmailFilter, ViewTarget } from "./types";

// The preview starts from the "Email Preview" preference, and ⌘D shows or hides it in every folder until the
// command closes. Each folder is its own view, so the choice is kept here rather than in a list's state.
let previewShown: boolean | undefined;
const previewListeners = new Set<() => void>();

function subscribeToPreview(onChange: () => void) {
  previewListeners.add(onChange);
  return () => {
    previewListeners.delete(onChange);
  };
}

function usePreview(): [boolean, () => void] {
  const shown = useSyncExternalStore(
    subscribeToPreview,
    () => previewShown ?? getPreferenceValues<Preferences.ListEmails>().showPreview,
  );
  const toggle = useCallback(() => {
    previewShown = !shown;
    previewListeners.forEach((onChange) => onChange());
  }, [shown]);
  return [shown, toggle];
}

function applyUpdate(emails: Email[], update: EmailUpdate, filter: EmailFilter): Email[] {
  // An email marked as read no longer belongs under the Unread filter, and the other way around
  const leavesFilter = "read" in update && (filter === "unread" ? update.read : filter === "read" && !update.read);
  if ("removed" in update || leavesFilter) return emails.filter((email) => email.uid !== update.uid);
  return emails.map((email) => (email.uid === update.uid ? withRead(email, update.read) : email));
}

export function EmailList({ folder, initialFilter }: { folder: string; initialFilter?: EmailFilter }) {
  const { push, pop } = useNavigation();
  const { data: folders, error: foldersError, revalidate: revalidateFolders } = useFolders();
  const pageSize = parseInt(getPreferenceValues<Preferences.ListEmails>().emailsToLoad || "50", 10);

  const [filter, setFilter] = useState<EmailFilter>(initialFilter || "all");
  const [searchText, setSearchText] = useState("");
  const [selectedUid, setSelectedUid] = useState<number>();
  const [demoMode, setDemoMode] = useState(false);
  const [showPreview, togglePreview] = usePreview();

  // Older emails load when scrolling to the bottom, in pages of "Emails to Load". useCachedPromise drops pages that
  // come back after the folder, filter or search changed, and caches the first page so it shows right away next time.
  const {
    data: emails = [],
    isLoading,
    error,
    revalidate,
    mutate,
    pagination,
  } = useCachedPromise(
    (folderPath: string, emailFilter: EmailFilter, query: string) =>
      async ({ page }: { page: number }) => {
        const data = await fetchEmails(folderPath, {
          filter: emailFilter,
          query,
          offset: page * pageSize,
          limit: pageSize,
        });
        return { data, hasMore: data.length === pageSize };
      },
    [folder, filter, searchText],
    { keepPreviousData: true, onError: () => undefined },
  );

  // Keep the connections open while the list is shown; they close once the command closes
  useEffect(() => holdConnections(), []);

  // Bridge not running or rejecting the credentials gets its own screen instead of an empty folder
  const bridgeError = bridgeErrorReason(error) ?? bridgeErrorReason(foldersError);
  useEffect(() => {
    if (error && !bridgeErrorReason(error)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: error.message || "Failed to connect to Proton Mail Bridge",
      });
    }
  }, [error]);

  const sections = useMemo(() => groupByDay(emails), [emails]);
  // The same for every email, and createDeeplink reads package.json from disk
  const quicklink = useMemo(
    () => ({
      name: `Proton Mail - ${folderDisplayName(folder)}${filter !== "all" ? ` (${filter})` : ""}`,
      link: createDeeplink({ command: "list-emails", context: { folder, filter } satisfies ViewTarget }),
    }),
    [folder, filter],
  );
  const subfolders = childFolders(folders || [], folder);

  const list: ListContext = {
    folder,
    quicklink,
    deletesPermanently: deletesPermanently(folder, folders || []),
    canArchive: findArchiveFolder(folders || [])?.path !== folder,
    onUpdate: (update) => {
      if ("removed" in update && holdsEverything(folder, folders || [])) {
        revalidate();
        return;
      }
      // Show the change right away instead of reloading the pages loaded so far
      mutate(undefined, {
        optimisticUpdate: (data) => applyUpdate(data ?? [], update, filter),
        shouldRevalidateAfter: false,
      });
    },
    showPreview,
    togglePreview,
    loadMore: pagination?.hasMore ? pagination.onLoadMore : undefined,
    isLoadingMore: isLoading && emails.length > 0,
    emailCount: emails.length,
    demoMode,
    toggleDemoMode: () => setDemoMode(!demoMode),
  };

  return (
    <List
      // Raycast hides the empty view while loading, so the error screen would blink on each reload
      isLoading={isLoading && !bridgeError}
      pagination={pagination}
      navigationTitle={folderDisplayName(folder)}
      isShowingDetail={showPreview}
      searchBarPlaceholder="Search by subject or sender..."
      // Search the whole folder on the server instead of fuzzy-matching the loaded page
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={<FilterDropdown filter={filter} onFilterChange={setFilter} />}
      onSelectionChange={(id) => {
        const uid = id ? parseInt(id, 10) : NaN;
        // Subfolder rows aren't emails: clear the selection so the previous email's detail doesn't stay open
        setSelectedUid(isNaN(uid) ? undefined : uid);
      }}
    >
      {!bridgeError && !searchText.trim() && subfolders.length > 0 && (
        <List.Section title="Folders">
          {subfolders.map((subfolder) => (
            <FolderListItem
              key={subfolder.path}
              folder={subfolder}
              onOpen={() => push(<EmailList folder={subfolder.path} initialFilter={filter} />, revalidateFolders)}
              onRefresh={revalidateFolders}
              onBack={pop}
            />
          ))}
        </List.Section>
      )}
      {bridgeError ? (
        <BridgeErrorView
          reason={bridgeError}
          onRetry={() => {
            revalidateFolders();
            revalidate();
          }}
        />
      ) : emails.length > 0 ? (
        sections.map((section) => (
          <List.Section key={section.key} title={section.title}>
            {section.emails.map(({ email, index }) => (
              <EmailListItem
                key={email.uid}
                email={demoMode ? anonymizeEmail(email, index) : email}
                isSelected={selectedUid === email.uid}
                list={list}
              />
            ))}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Envelope}
          title="No Emails"
          description={`No emails found in ${folderDisplayName(folder)}${filter !== "all" ? ` with filter "${filter}"` : ""}${searchText.trim() ? ` matching "${searchText.trim()}"` : ""}`}
          actions={
            <ActionPanel>
              <BackAction onBack={pop} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Sections like Mail: Today, Yesterday, then one per month
function groupByDay(emails: Email[]): { key: string; title: string; emails: { email: Email; index: number }[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  // Pages are appended as they load, so sort the whole list to keep each heading in one place
  const sorted = emails
    .map((email, index) => ({ email, index, date: new Date(email.date) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const sections: { key: string; title: string; emails: { email: Email; index: number }[] }[] = [];
  for (const { email, index, date } of sorted) {
    let title: string;
    if (date >= startOfToday && date < startOfTomorrow) title = "Today";
    else if (date >= startOfYesterday && date < startOfToday) title = "Yesterday";
    // Future-dated emails (wrong sender clock) go under their month rather than "Today"
    else title = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const last = sections[sections.length - 1];
    if (last?.title === title) last.emails.push({ email, index });
    // A future-dated email can share its month with older ones, so key sections by their first email
    else sections.push({ key: `${title}-${email.uid}`, title, emails: [{ email, index }] });
  }
  return sections;
}

// Folders live on the Mailboxes screen, so the dropdown only holds filters
function FilterDropdown({
  filter,
  onFilterChange,
}: {
  filter: EmailFilter;
  onFilterChange: (filter: EmailFilter) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter" value={filter} onChange={(value) => onFilterChange(value as EmailFilter)}>
      <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
      <List.Dropdown.Item title="Unread" value="unread" icon={Icon.Circle} />
      <List.Dropdown.Item title="Read" value="read" icon={Icon.CheckCircle} />
      <List.Dropdown.Item title="Has Attachment" value="attachment" icon={Icon.Paperclip} />
    </List.Dropdown>
  );
}

// Everything the list passes down to its emails
interface ListContext extends EmailContext {
  quicklink: { name: string; link: string };
  showPreview: boolean;
  togglePreview: () => void;
  loadMore?: () => void;
  isLoadingMore: boolean;
  emailCount: number;
  demoMode: boolean;
  toggleDemoMode: () => void;
}

function EmailListItem({ email, isSelected, list }: { email: Email; isSelected: boolean; list: ListContext }) {
  const sender = email.from[0]?.name || email.from[0]?.address || "Unknown";

  return (
    <List.Item
      id={email.uid.toString()}
      title={email.subject}
      subtitle={sender}
      icon={isRead(email) ? Icon.CheckCircle : { source: Icon.Circle, tintColor: Color.Blue }}
      accessories={[
        ...(email.hasAttachment ? [{ icon: Icon.Paperclip }] : []),
        { date: new Date(email.date), tooltip: new Date(email.date).toLocaleString() },
      ]}
      detail={
        list.showPreview && isSelected ? (
          <EmailDetail email={email} folder={list.folder} demoMode={list.demoMode} />
        ) : undefined
      }
      actions={<EmailListActions email={email} list={list} />}
    />
  );
}

function EmailListActions({ email, list }: { email: Email; list: ListContext }) {
  const { push, pop } = useNavigation();
  const { folder } = list;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Email Actions">
        <Action
          title="Expand Email"
          icon={Icon.Maximize}
          onAction={() => push(<ExpandedEmailView email={email} context={list} initialDemoMode={list.demoMode} />)}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
        <RespondActions email={email} folder={folder} />
        <Action
          title="Compose New Email"
          icon={Icon.NewDocument}
          onAction={() => push(<ComposeForm mode="new" />)}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>

      <ManageActions email={email} read={isRead(email)} context={list} />

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Subject"
          content={email.subject}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Sender Address"
          content={email.from[0]?.address || ""}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action
          title="Copy Email as Markdown"
          icon={Icon.Document}
          onAction={() => copyEmailAsMarkdown(email, folder)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Quicklinks">
        <Action.CreateQuicklink
          title="Save Current View as Quicklink"
          quicklink={list.quicklink}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        />
      </ActionPanel.Section>

      {list.loadMore && (
        <ActionPanel.Section title="Pagination">
          <Action
            title={list.isLoadingMore ? "Loading…" : `Load More Emails (${list.emailCount} loaded)`}
            icon={list.isLoadingMore ? Icon.Clock : Icon.ArrowDown}
            onAction={list.loadMore}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Display">
        <Action
          title={list.demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
          icon={list.demoMode ? Icon.EyeDisabled : Icon.Eye}
          onAction={list.toggleDemoMode}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      </ActionPanel.Section>

      {/* New actions go last so existing ones keep their positions */}
      <ActionPanel.Section title="Original">
        <Action
          title="Open Original in Browser"
          icon={Icon.Window}
          onAction={() => openOriginalInBrowser(folder, email)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="View">
        <Action
          title={list.showPreview ? "Hide Preview" : "Show Preview"}
          icon={Icon.Sidebar}
          onAction={list.togglePreview}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Navigation">
        <BackAction onBack={pop} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
