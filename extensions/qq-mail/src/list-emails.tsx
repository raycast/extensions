import { useState, useEffect, useCallback, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
  LaunchProps,
  Detail,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import {
  listFolders,
  fetchEmails,
  fetchEmailBody,
  markAsRead,
  markAsUnread,
  starEmail,
  unstarEmail,
  deleteEmail,
  archiveEmail,
  disconnectClient,
} from "./imap-client";
import { Email, Folder, EmailFilter } from "./types";
import { ComposeForm, ComposeMode } from "./compose-form";
import { AttachmentList } from "./attachment-list";

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function emailListId(email: Email): string {
  return `${email.mailboxPath}:${email.uid}`;
}

interface CommandArguments {
  folder?: string;
  filter?: string;
}

export default function Command(props?: LaunchProps<{ arguments: CommandArguments }>) {
  const prefs = getPreferenceValues<Preferences>();
  const { folder, filter } = props?.arguments || {};

  // Check if preferences are configured
  if (!prefs.username || !prefs.password) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Gear}
          title="Configure Extension"
          description="Please configure your QQ Mail account settings in the extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <EmailList initialFolder={folder} initialFilter={filter as EmailFilter} />;
}

interface EmailListProps {
  initialFolder?: string;
  initialFilter?: EmailFilter;
}

function EmailList(props: EmailListProps = {}) {
  const { initialFolder, initialFilter } = props;
  const prefs = getPreferenceValues<Preferences>();
  const pageSize = parseInt(prefs.emailsToLoad || "20", 10);

  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolder || "INBOX");
  const [filter, setFilter] = useState<EmailFilter>(initialFilter || "all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loadedEmails, setLoadedEmails] = useState<Email[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch folders
  const { data: folders, isLoading: foldersLoading, error: foldersError } = useCachedPromise(listFolders, []);

  // Fetch emails for selected folder
  const {
    data: emails,
    isLoading: emailsLoading,
    error: emailsError,
    revalidate: revalidateEmails,
  } = usePromise(
    async (folder: string, emailFilter: EmailFilter) => {
      const filterParam = emailFilter === "all" ? undefined : emailFilter;
      return await fetchEmails({
        folderPath: folder,
        limit: pageSize,
        filter: filterParam as "unread" | "read" | "attachment" | undefined,
      });
    },
    [selectedFolder, filter],
  );

  // Reset pagination when folder or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    setLoadedEmails([]);
  }, [selectedFolder, filter]);

  // Update loaded emails when initial fetch completes
  useEffect(() => {
    if (emails && currentPage === 1) {
      setLoadedEmails(emails);
      setHasMore(emails.length >= pageSize);
    }
  }, [emails, currentPage, pageSize]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const filterParam = filter === "all" ? undefined : filter;
      const offset = currentPage * pageSize;
      const moreEmails = await fetchEmails({
        folderPath: selectedFolder,
        limit: pageSize,
        filter: filterParam as "unread" | "read" | "attachment" | undefined,
        offset,
      });

      if (moreEmails.length < pageSize) {
        setHasMore(false);
      }

      setLoadedEmails((prev) => [...prev, ...moreEmails]);
      setCurrentPage((prev) => prev + 1);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load more emails", message: String(error) });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, filter, currentPage, pageSize, selectedFolder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectClient().catch(console.error);
    };
  }, []);

  // Handle errors
  useEffect(() => {
    if (foldersError || emailsError) {
      const error = foldersError || emailsError;
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: error?.message || "Failed to connect to QQ Mail",
      });
    }
  }, [foldersError, emailsError]);

  const updateEmailFlags = useCallback((id: string, updater: (flags: string[]) => string[]) => {
    setLoadedEmails((prev) =>
      prev.map((email) => (emailListId(email) === id ? { ...email, flags: updater([...email.flags]) } : email)),
    );
  }, []);

  const handleFolderChange = useCallback((newFolder: string) => {
    setSelectedFolder(newFolder);
    setFilter("all");
    setSelectedEmailId(null);
  }, []);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter as EmailFilter);
  }, []);

  const isLoading = foldersLoading || emailsLoading;
  const showEmptyView = !isLoading && loadedEmails.length === 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={selectedEmailId !== null}
      searchBarPlaceholder="Search emails..."
      searchBarAccessory={
        <FilterDropdowns
          folders={folders || []}
          selectedFolder={selectedFolder}
          onFolderChange={handleFolderChange}
          filter={filter}
          onFilterChange={handleFilterChange}
        />
      }
      onSelectionChange={(id) => {
        setSelectedEmailId(id ?? null);
      }}
    >
      {loadedEmails.length > 0
        ? loadedEmails.map((email) => (
            <EmailListItem
              key={emailListId(email)}
              email={email}
              filter={filter}
              isSelected={selectedEmailId === emailListId(email)}
              onRefresh={revalidateEmails}
              onUpdateFlags={updateEmailFlags}
              onLoadMore={hasMore ? handleLoadMore : undefined}
              isLoadingMore={isLoadingMore}
              emailCount={loadedEmails.length}
            />
          ))
        : showEmptyView && (
            <List.EmptyView
              icon={Icon.Envelope}
              title="No Emails"
              description={`No emails found in ${selectedFolder}${filter !== "all" ? ` with filter "${filter}"` : ""}`}
            />
          )}
    </List>
  );
}

interface FilterDropdownsProps {
  folders: Folder[];
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  filter: EmailFilter;
  onFilterChange: (filter: string) => void;
}

const FILTER_VALUE_PREFIX = "filter:";

function filterDropdownValue(filter: EmailFilter): string {
  return `${FILTER_VALUE_PREFIX}${filter}`;
}

function FilterDropdowns(props: FilterDropdownsProps) {
  const { folders, selectedFolder, onFolderChange, filter, onFilterChange } = props;
  const dropdownValue = filter !== "all" ? filterDropdownValue(filter) : selectedFolder;

  // Filter out \Noselect folders (containers that can't hold messages)
  const selectableFolders = folders.filter((folder) => !hasFlag(folder.flags, "\\Noselect"));

  const handleChange = (value: string) => {
    if (value.startsWith(FILTER_VALUE_PREFIX)) {
      onFilterChange(value.slice(FILTER_VALUE_PREFIX.length));
    } else {
      onFolderChange(value);
    }
  };

  return (
    <List.Dropdown tooltip="Select Folder or Filter" value={dropdownValue} onChange={handleChange}>
      <List.Dropdown.Section title="Folders">
        {selectableFolders.map((folder) => (
          <List.Dropdown.Item key={folder.path} title={folder.name} value={folder.path} icon={getFolderIcon(folder)} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Filter">
        <List.Dropdown.Item
          title={`All${filter === "all" ? " ✓" : ""}`}
          value={filterDropdownValue("all")}
          icon={Icon.List}
        />
        <List.Dropdown.Item
          title={`Unread${filter === "unread" ? " ✓" : ""}`}
          value={filterDropdownValue("unread")}
          icon={Icon.Circle}
        />
        <List.Dropdown.Item
          title={`Read${filter === "read" ? " ✓" : ""}`}
          value={filterDropdownValue("read")}
          icon={Icon.CheckCircle}
        />
        <List.Dropdown.Item
          title={`Has Attachment${filter === "attachment" ? " ✓" : ""}`}
          value={filterDropdownValue("attachment")}
          icon={Icon.Paperclip}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function getFolderIcon(folder: Folder): Icon {
  switch (folder.specialUse) {
    case "\\Inbox":
      return Icon.Envelope;
    case "\\Sent":
      return Icon.Airplane;
    case "\\Drafts":
      return Icon.Pencil;
    case "\\Trash":
      return Icon.Trash;
    case "\\Junk":
      return Icon.ExclamationMark;
    case "\\Archive":
      return Icon.Box;
    case "\\Flagged":
      return Icon.Star;
    default:
      if (folder.path.toUpperCase() === "INBOX") return Icon.Envelope;
      return Icon.Folder;
  }
}

interface EmailListItemProps {
  email: Email;
  filter: EmailFilter;
  isSelected: boolean;
  onRefresh: () => void;
  onUpdateFlags: (id: string, updater: (flags: string[]) => string[]) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  emailCount?: number;
}

function hasFlag(flags: string[] | unknown, flag: string): boolean {
  if (Array.isArray(flags)) return flags.includes(flag);
  return false;
}

// Clean HTML content for display, removing VML, CSS, and other markup
// Set includeImages to false to strip image markdown (for compact list/detail view)
function cleanHtmlForDisplay(html: string, includeImages: boolean = true): string {
  let text = html;

  // Remove style, script, and head tags with their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // Remove VML/XML behavior declarations (Microsoft Outlook)
  text = text.replace(/v:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/o:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/w:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/\.shape\s*\{[^}]*\}/gi, "");
  text = text.replace(/\{behavior:url\([^)]*\)[^}]*\}/gi, "");

  // Remove CSS-like declarations that leaked through
  text = text.replace(/[a-z]+:\*\s*\{[^}]*\}/gi, "");

  // Convert common HTML entities
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)));

  // Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  // Convert standalone URLs in brackets to markdown format
  if (includeImages) {
    // Image URLs (png, jpg, jpeg, gif, webp, svg) -> ![](url)
    text = text.replace(/\[(https?:\/\/[^\]]+\.(png|jpg|jpeg|gif|webp|svg)(?:\?[^\]]*)?)\]/gi, "![]($1)");
  } else {
    // Strip image URLs entirely for compact view
    text = text.replace(/\[(https?:\/\/[^\]]+\.(png|jpg|jpeg|gif|webp|svg)(?:\?[^\]]*)?)\]/gi, "");
  }
  // Other URLs -> [link](url)
  text = text.replace(/\[(https?:\/\/[^\]]+)\]/gi, (match, url) => {
    // Skip if already converted to image
    if (match.startsWith("![")) return match;
    return `[link](${url})`;
  });

  // If not including images, also remove any markdown image syntax that might exist
  if (!includeImages) {
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

    // Remove common "view in browser" / "click here" boilerplate text
    text = text.replace(/click here to view this message in a browser[^\n]*/gi, "");
    text = text.replace(/view this (email|message) in (your |a )?browser[^\n]*/gi, "");
    text = text.replace(/having trouble viewing this[^\n]*/gi, "");
    text = text.replace(/can't see this (email|message)[^\n]*/gi, "");
    text = text.replace(/not displaying correctly[^\n]*/gi, "");
    text = text.replace(/view (this )?(email |message )?online[^\n]*/gi, "");
    text = text.replace(/view in browser[^\n]*/gi, "");
    text = text.replace(/open in browser[^\n]*/gi, "");

    // Convert standalone long URLs to markdown links for compact display
    // This preserves the link while keeping the preview clean
    text = text.replace(/(?<!\()(?<!\[)(https?:\/\/[^\s\n]{50,})(?!\))/g, (url) => `[link](${url})`);

    // For compact view, collapse 3+ newlines to 2 for tighter display
    text = text.replace(/\n{3,}/g, "\n\n");
  } else {
    // For expanded view, allow max 2 consecutive newlines
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  return text.trim();
}

function EmailListItem(props: EmailListItemProps) {
  const { email, filter, isSelected, onRefresh, onUpdateFlags, onLoadMore, isLoadingMore, emailCount } = props;
  const emailId = emailListId(email);
  const isUnread = !hasFlag(email.flags, "\\Seen");
  const isStarred = hasFlag(email.flags, "\\Flagged");
  const fromDisplay = email.from[0]?.name || email.from[0]?.address || "Unknown";
  const readIcon = {
    source: isUnread ? Icon.Circle : Icon.CheckCircle,
    tintColor: isUnread ? Color.Blue : Color.Green,
  };

  const accessories: List.Item.Accessory[] = [];
  if (isStarred) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Starred" });
  }
  if (email.hasAttachment) {
    accessories.push({ icon: Icon.Paperclip, tooltip: "Has Attachment" });
  }

  return (
    <List.Item
      id={emailId}
      title={email.subject}
      subtitle={fromDisplay}
      icon={readIcon}
      accessories={accessories}
      detail={isSelected && <EmailDetail email={email} />}
      actions={
        <EmailActions
          email={email}
          filter={filter}
          onRefresh={onRefresh}
          onUpdateFlags={onUpdateFlags}
          onLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          emailCount={emailCount}
        />
      }
    />
  );
}

interface EmailDetailProps {
  email: Email;
}

function EmailDetail(props: EmailDetailProps) {
  const { email } = props;
  const { data: body, isLoading } = useCachedPromise(
    (mailboxPath: string, uid: number) => fetchEmailBody(mailboxPath, uid),
    [email.mailboxPath, email.uid],
  );

  const isUnread = !hasFlag(email.flags, "\\Seen");
  const fromDisplay = email.from.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const toDisplay = email.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const ccDisplay = email.cc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");

  // Build markdown with just the email body (metadata is shown below)
  // Skip images in list/detail view (includeImages=false) - they show in expanded view
  const renderMarkdown = () => {
    if (isLoading) {
      return `*⏳ Loading email content...*`;
    }
    if (body?.text) {
      return cleanHtmlForDisplay(body.text, false);
    }
    if (body?.html) {
      return cleanHtmlForDisplay(body.html, false);
    }
    return email.preview || "*No content available*";
  };

  return (
    <List.Item.Detail
      markdown={renderMarkdown()}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Subject" text={email.subject} />
          <List.Item.Detail.Metadata.Label title="From" text={fromDisplay} />
          <List.Item.Detail.Metadata.Label title="To" text={toDisplay} />
          {ccDisplay && <List.Item.Detail.Metadata.Label title="CC" text={ccDisplay} />}
          <List.Item.Detail.Metadata.Label title="Date" text={formatDate(email.date)} />
          {(email.hasAttachment || isUnread) && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Status">
                {isUnread && <List.Item.Detail.Metadata.TagList.Item text="Unread" color={Color.Blue} />}
                {email.hasAttachment && (
                  <List.Item.Detail.Metadata.TagList.Item text="Attachment" color={Color.Orange} />
                )}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface ExpandedEmailViewProps {
  email: Email;
  onRefresh?: () => void;
  onUpdateFlags?: (id: string, updater: (flags: string[]) => string[]) => void;
}

function ExpandedEmailView(props: ExpandedEmailViewProps) {
  const { email, onRefresh, onUpdateFlags } = props;
  const emailId = emailListId(email);
  const { push } = useNavigation();
  const { data: body, isLoading } = useCachedPromise(
    async (mailboxPath: string, uid: number) => {
      return await fetchEmailBody(mailboxPath, uid);
    },
    [email.mailboxPath, email.uid],
  );

  const fromDisplay = email.from.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const toDisplay = email.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const ccDisplay = email.cc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const fromAddress = email.from[0]?.address || "";
  const isUnread = !hasFlag(email.flags, "\\Seen");

  const markdown = useMemo(() => {
    if (isLoading) {
      return `*⏳ Loading email content...*`;
    }
    if (body?.text) {
      return cleanHtmlForDisplay(body.text, false);
    }
    if (body?.html) {
      return cleanHtmlForDisplay(body.html, false);
    }
    return email.preview || "*No content available*";
  }, [body?.text, body?.html, email.preview, isLoading]);

  const getEmailBodyForCompose = async (): Promise<string> => {
    if (body?.text) return body.text;
    if (body?.html) return body.html.replace(/<[^>]*>/g, "");
    return email.preview || "";
  };

  const openComposeForm = async (mode: ComposeMode) => {
    const bodyText = await getEmailBodyForCompose();
    push(
      <ComposeForm
        mode={mode}
        originalEmail={{
          subject: email.subject,
          from: fromAddress,
          to: email.to.map((a) => a.address),
          cc: email.cc?.map((a) => a.address) || [],
          date: email.date,
          body: bodyText,
        }}
      />,
    );
  };

  const isStarred = hasFlag(email.flags, "\\Flagged");

  const handleStar = async () => {
    onUpdateFlags?.(emailId, (flags) => (flags.includes("\\Flagged") ? flags : [...flags, "\\Flagged"]));
    try {
      await starEmail(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Starred" });
      onRefresh?.();
    } catch (error) {
      onUpdateFlags?.(emailId, (flags) => flags.filter((f) => f !== "\\Flagged"));
      showToast({ style: Toast.Style.Failure, title: "Failed to star", message: String(error) });
    }
  };

  const handleUnstar = async () => {
    onUpdateFlags?.(emailId, (flags) => flags.filter((f) => f !== "\\Flagged"));
    try {
      await unstarEmail(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Unstarred" });
      onRefresh?.();
    } catch (error) {
      onUpdateFlags?.(emailId, (flags) => (flags.includes("\\Flagged") ? flags : [...flags, "\\Flagged"]));
      showToast({ style: Toast.Style.Failure, title: "Failed to unstar", message: String(error) });
    }
  };

  const handleMarkAsRead = async () => {
    onUpdateFlags?.(emailId, (flags) => (flags.includes("\\Seen") ? flags : [...flags, "\\Seen"]));
    try {
      await markAsRead(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as read" });
      onRefresh?.();
    } catch (error) {
      onUpdateFlags?.(emailId, (flags) => flags.filter((f) => f !== "\\Seen"));
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as read", message: String(error) });
    }
  };

  const handleMarkAsUnread = async () => {
    onUpdateFlags?.(emailId, (flags) => flags.filter((f) => f !== "\\Seen"));
    try {
      await markAsUnread(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as unread" });
      onRefresh?.();
    } catch (error) {
      onUpdateFlags?.(emailId, (flags) => (flags.includes("\\Seen") ? flags : [...flags, "\\Seen"]));
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as unread", message: String(error) });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveEmail(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Archived" });
      onRefresh?.();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to archive", message: String(error) });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Email",
      message: "Are you sure you want to delete this email?",
    });
    if (confirmed) {
      try {
        await deleteEmail(email.mailboxPath, email.uid);
        showToast({ style: Toast.Style.Success, title: "Deleted" });
        onRefresh?.();
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete", message: String(error) });
      }
    }
  };

  const handleDownloadAttachments = () => {
    push(<AttachmentList mailboxPath={email.mailboxPath} emailUid={email.uid} emailSubject={email.subject} />);
  };

  return (
    <Detail
      navigationTitle={email.subject}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Subject" text={email.subject} />
          <Detail.Metadata.Label title="From" text={fromDisplay} />
          <Detail.Metadata.Label title="To" text={toDisplay} />
          {ccDisplay && <Detail.Metadata.Label title="CC" text={ccDisplay} />}
          <Detail.Metadata.Label title="Date" text={formatDate(email.date)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            {hasFlag(email.flags, "\\Seen") ? (
              <Detail.Metadata.TagList.Item text="Read" color={Color.Green} />
            ) : (
              <Detail.Metadata.TagList.Item text="Unread" color={Color.Blue} />
            )}
            {email.hasAttachment && <Detail.Metadata.TagList.Item text="Attachment" color={Color.Orange} />}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Email Actions">
            <Action
              title="Reply"
              icon={Icon.Reply}
              onAction={() => openComposeForm("reply")}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reply All"
              icon={Icon.Reply}
              onAction={() => openComposeForm("replyAll")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Forward"
              icon={Icon.ArrowRight}
              onAction={() => openComposeForm("forward")}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            {email.hasAttachment && (
              <Action
                title="Download Attachments"
                icon={Icon.Download}
                onAction={handleDownloadAttachments}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            {isStarred ? (
              <Action
                title="Unstar"
                icon={Icon.StarDisabled}
                onAction={handleUnstar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            ) : (
              <Action
                title="Star"
                icon={Icon.Star}
                onAction={handleStar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            )}
            {isUnread ? (
              <Action
                title="Mark as Read"
                icon={Icon.CheckCircle}
                onAction={handleMarkAsRead}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            ) : (
              <Action
                title="Mark as Unread"
                icon={Icon.Circle}
                onAction={handleMarkAsUnread}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            )}
            <Action
              title="Archive"
              icon={Icon.Box}
              onAction={handleArchive}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Email Body" content={markdown} />
            <Action.CopyToClipboard
              title="Copy Email Body as Markdown"
              content={`# ${email.subject}\n\n**From:** ${fromDisplay}\n**To:** ${toDisplay}${ccDisplay ? `\n**CC:** ${ccDisplay}` : ""}\n**Date:** ${formatDate(email.date)}\n\n---\n\n${markdown}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy Subject"
              content={email.subject}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Sender"
              content={fromDisplay}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface EmailActionsProps {
  email: Email;
  filter: EmailFilter;
  onRefresh: () => void;
  onUpdateFlags: (id: string, updater: (flags: string[]) => string[]) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  emailCount?: number;
}

function EmailActions(props: EmailActionsProps) {
  const { email, onRefresh, onUpdateFlags, onLoadMore, isLoadingMore, emailCount } = props;
  const emailId = emailListId(email);
  const { push } = useNavigation();
  const isUnread = !hasFlag(email.flags, "\\Seen");
  const fromAddress = email.from[0]?.address || "";

  // Fetch email body for compose form
  const getEmailBodyForCompose = async (): Promise<string> => {
    try {
      const body = await fetchEmailBody(email.mailboxPath, email.uid);
      return body.text || body.html?.replace(/<[^>]*>/g, "") || email.preview || "";
    } catch {
      return email.preview || "";
    }
  };

  // Build display strings for copy actions
  const fromDisplay = email.from.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const toDisplay = email.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const ccDisplay = email.cc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");

  const handleCopyAsMarkdown = async () => {
    try {
      const body = await fetchEmailBody(email.mailboxPath, email.uid);
      let bodyText = "";
      if (body?.text) {
        bodyText = cleanHtmlForDisplay(body.text);
      } else if (body?.html) {
        bodyText = cleanHtmlForDisplay(body.html);
      } else {
        bodyText = email.preview || "";
      }

      const markdown = `# ${email.subject}\n\n**From:** ${fromDisplay}\n**To:** ${toDisplay}${ccDisplay ? `\n**CC:** ${ccDisplay}` : ""}\n**Date:** ${formatDate(email.date)}\n\n---\n\n${bodyText}`;

      await Clipboard.copy(markdown);
      showToast({ style: Toast.Style.Success, title: "Copied as Markdown" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to copy", message: String(error) });
    }
  };

  const openComposeForm = async (mode: ComposeMode) => {
    const bodyText = await getEmailBodyForCompose();
    push(
      <ComposeForm
        mode={mode}
        originalEmail={{
          subject: email.subject,
          from: fromAddress,
          to: email.to.map((a) => a.address),
          cc: email.cc?.map((a) => a.address) || [],
          date: email.date,
          body: bodyText,
        }}
      />,
    );
  };

  const handleMarkAsRead = async () => {
    // Optimistic update: immediately reflect the change in UI
    onUpdateFlags(emailId, (flags) => (flags.includes("\\Seen") ? flags : [...flags, "\\Seen"]));
    try {
      await markAsRead(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as read" });
      onRefresh();
    } catch (error) {
      // Rollback on failure
      onUpdateFlags(emailId, (flags) => flags.filter((f) => f !== "\\Seen"));
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as read", message: String(error) });
    }
  };

  const handleMarkAsUnread = async () => {
    // Optimistic update: immediately reflect the change in UI
    onUpdateFlags(emailId, (flags) => flags.filter((f) => f !== "\\Seen"));
    try {
      await markAsUnread(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as unread" });
      onRefresh();
    } catch (error) {
      // Rollback on failure
      onUpdateFlags(emailId, (flags) => (flags.includes("\\Seen") ? flags : [...flags, "\\Seen"]));
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as unread", message: String(error) });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Email",
      message: `Are you sure you want to delete "${email.subject}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteEmail(email.mailboxPath, email.uid);
        showToast({ style: Toast.Style.Success, title: "Email deleted" });
        onRefresh();
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete email", message: String(error) });
      }
    }
  };

  const handleArchive = async () => {
    try {
      await archiveEmail(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Email archived" });
      onRefresh();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to archive email", message: String(error) });
    }
  };

  const isStarred = hasFlag(email.flags, "\\Flagged");

  const handleStar = async () => {
    onUpdateFlags(emailId, (flags) => (flags.includes("\\Flagged") ? flags : [...flags, "\\Flagged"]));
    try {
      await starEmail(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Starred" });
      onRefresh();
    } catch (error) {
      onUpdateFlags(emailId, (flags) => flags.filter((f) => f !== "\\Flagged"));
      showToast({ style: Toast.Style.Failure, title: "Failed to star", message: String(error) });
    }
  };

  const handleUnstar = async () => {
    onUpdateFlags(emailId, (flags) => flags.filter((f) => f !== "\\Flagged"));
    try {
      await unstarEmail(email.mailboxPath, email.uid);
      showToast({ style: Toast.Style.Success, title: "Unstarred" });
      onRefresh();
    } catch (error) {
      onUpdateFlags(emailId, (flags) => (flags.includes("\\Flagged") ? flags : [...flags, "\\Flagged"]));
      showToast({ style: Toast.Style.Failure, title: "Failed to unstar", message: String(error) });
    }
  };

  const handleReply = async () => {
    await openComposeForm("reply");
  };

  const handleReplyAll = async () => {
    await openComposeForm("replyAll");
  };

  const handleForward = async () => {
    await openComposeForm("forward");
  };

  const handleDownloadAttachments = () => {
    push(<AttachmentList mailboxPath={email.mailboxPath} emailUid={email.uid} emailSubject={email.subject} />);
  };

  const handleExpandEmail = () => {
    push(<ExpandedEmailView email={email} onRefresh={onRefresh} onUpdateFlags={onUpdateFlags} />);
  };

  const handleCompose = () => {
    push(<ComposeForm mode="new" />);
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title="Email Actions">
        <Action
          title="Expand Email"
          icon={Icon.Maximize}
          onAction={handleExpandEmail}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
        <Action title="Reply" icon={Icon.Reply} onAction={handleReply} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        <Action
          title="Reply All"
          icon={Icon.Reply}
          onAction={handleReplyAll}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
        <Action
          title="Forward"
          icon={Icon.ArrowRight}
          onAction={handleForward}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        />
        {email.hasAttachment && (
          <Action
            title="Download Attachments"
            icon={Icon.Download}
            onAction={handleDownloadAttachments}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        )}
        <Action
          title="Compose New Email"
          icon={Icon.NewDocument}
          onAction={handleCompose}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Manage">
        {isStarred ? (
          <Action
            title="Unstar"
            icon={Icon.StarDisabled}
            onAction={handleUnstar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        ) : (
          <Action
            title="Star"
            icon={Icon.Star}
            onAction={handleStar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        )}
        {isUnread ? (
          <Action
            title="Mark as Read"
            icon={Icon.CheckCircle}
            onAction={handleMarkAsRead}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        ) : (
          <Action
            title="Mark as Unread"
            icon={Icon.Circle}
            onAction={handleMarkAsUnread}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        )}
        <Action title="Archive" icon={Icon.Box} onAction={handleArchive} shortcut={{ modifiers: ["cmd"], key: "e" }} />
        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDelete}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Subject"
          content={email.subject}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Sender Address"
          content={fromAddress}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action
          title="Copy Email as Markdown"
          icon={Icon.Document}
          onAction={handleCopyAsMarkdown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
      </ActionPanel.Section>

      {onLoadMore && (
        <ActionPanel.Section title="Pagination">
          <Action
            title={isLoadingMore ? "Loading…" : `Load More Emails (${emailCount} loaded)`}
            icon={isLoadingMore ? Icon.Clock : Icon.ArrowDown}
            onAction={onLoadMore}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
