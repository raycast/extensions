import { useState, useEffect, useCallback } from "react";
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
  open,
  useNavigation,
  LaunchProps,
  Detail,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listFolders,
  fetchEmails,
  fetchEmailBody,
  markAsRead,
  markAsUnread,
  deleteEmail,
  archiveEmail,
  disconnectClient,
} from "./imap-client";
import { Email, Folder, EmailFilter } from "./types";
import { ComposeForm, ComposeMode } from "./compose-form";
import { AttachmentList } from "./attachment-list";

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
          description="Please configure your Proton Mail Bridge settings in the extension preferences."
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

// Demo mode names for anonymization
const DEMO_NAMES = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
  "Frank Miller",
  "Grace Wilson",
  "Henry Moore",
];

const DEMO_SUBJECTS = [
  "Meeting Follow-up",
  "Project Update",
  "Quick Question",
  "Weekly Report",
  "Action Required",
  "FYI: Important Notice",
  "Re: Your Request",
  "Invitation: Team Sync",
];

const DEMO_BODY = `Hi there,

Thank you for your email. I wanted to follow up on our previous conversation regarding the project timeline.

Please let me know if you have any questions or concerns.

Best regards`;

function anonymizeEmail(email: Email, index: number): Email {
  const nameIndex = index % DEMO_NAMES.length;
  const subjectIndex = index % DEMO_SUBJECTS.length;
  const demoName = DEMO_NAMES[nameIndex];
  const demoEmail = demoName.toLowerCase().replace(" ", ".") + "@example.com";

  return {
    ...email,
    subject: DEMO_SUBJECTS[subjectIndex],
    from: [{ name: demoName, address: demoEmail }],
    to: [{ name: "You", address: "you@example.com" }],
    cc: email.cc ? [{ name: DEMO_NAMES[(nameIndex + 1) % DEMO_NAMES.length], address: "cc@example.com" }] : undefined,
    preview: DEMO_BODY.substring(0, 100),
  };
}

function EmailList({ initialFolder, initialFilter }: EmailListProps = {}) {
  const prefs = getPreferenceValues<Preferences>();
  const pageSize = parseInt(prefs.emailsToLoad || "50", 10);

  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolder || "INBOX");
  const [filter, setFilter] = useState<EmailFilter>(initialFilter || "all");
  const [selectedEmailUid, setSelectedEmailUid] = useState<number | null>(null);
  const [loadedEmails, setLoadedEmails] = useState<Email[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Fetch folders
  const {
    data: folders,
    isLoading: foldersLoading,
    error: foldersError,
  } = useCachedPromise(async () => {
    return await listFolders();
  }, []);

  // Fetch emails for selected folder
  const {
    data: emails,
    isLoading: emailsLoading,
    error: emailsError,
    revalidate: revalidateEmails,
  } = useCachedPromise(
    async (folder: string, emailFilter: EmailFilter) => {
      const filterParam = emailFilter === "all" ? undefined : emailFilter;
      return await fetchEmails(folder, pageSize, filterParam as "unread" | "read" | "attachment" | undefined);
    },
    [selectedFolder, filter],
    {
      keepPreviousData: true,
    },
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
      const moreEmails = await fetchEmails(
        selectedFolder,
        pageSize,
        filterParam as "unread" | "read" | "attachment" | undefined,
        offset,
      );

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
        message: error?.message || "Failed to connect to Proton Mail Bridge",
      });
    }
  }, [foldersError, emailsError]);

  const handleFolderChange = useCallback((newFolder: string) => {
    setSelectedFolder(newFolder);
    setSelectedEmailUid(null);
  }, []);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter as EmailFilter);
  }, []);

  const isLoading = foldersLoading || emailsLoading;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={selectedEmailUid !== null}
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
        if (id) {
          const uid = parseInt(id, 10);
          if (!isNaN(uid)) {
            setSelectedEmailUid(uid);
          }
        }
      }}
    >
      {loadedEmails && loadedEmails.length > 0 ? (
        loadedEmails.map((email, index) => (
          <EmailListItem
            key={email.uid}
            email={demoMode ? anonymizeEmail(email, index) : email}
            folder={selectedFolder}
            filter={filter}
            isSelected={selectedEmailUid === email.uid}
            onRefresh={revalidateEmails}
            onLoadMore={hasMore ? handleLoadMore : undefined}
            isLoadingMore={isLoadingMore}
            emailCount={loadedEmails.length}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(!demoMode)}
          />
        ))
      ) : (
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

function FilterDropdowns({ folders, selectedFolder, onFolderChange, filter, onFilterChange }: FilterDropdownsProps) {
  // Combine folder and filter into a single value for the dropdown
  const combinedValue = `${selectedFolder}::${filter}`;

  // Filter out \Noselect folders (containers that can't hold messages)
  const selectableFolders = folders.filter((folder) => !hasFlag(folder.flags, "\\Noselect"));

  const handleChange = (value: string) => {
    // Check if it's a filter value
    if (["all", "unread", "read", "attachment"].includes(value)) {
      onFilterChange(value);
    } else {
      // It's a folder path
      onFolderChange(value);
    }
  };

  return (
    <List.Dropdown tooltip="Select Folder or Filter" value={combinedValue.split("::")[0]} onChange={handleChange}>
      <List.Dropdown.Section title="Folders">
        {selectableFolders.map((folder) => (
          <List.Dropdown.Item key={folder.path} title={folder.name} value={folder.path} icon={getFolderIcon(folder)} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Filter">
        <List.Dropdown.Item title={`All${filter === "all" ? " ✓" : ""}`} value="all" icon={Icon.List} />
        <List.Dropdown.Item title={`Unread${filter === "unread" ? " ✓" : ""}`} value="unread" icon={Icon.Circle} />
        <List.Dropdown.Item title={`Read${filter === "read" ? " ✓" : ""}`} value="read" icon={Icon.CheckCircle} />
        <List.Dropdown.Item
          title={`Has Attachment${filter === "attachment" ? " ✓" : ""}`}
          value="attachment"
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
    default:
      if (folder.path.toUpperCase() === "INBOX") return Icon.Envelope;
      return Icon.Folder;
  }
}

interface EmailListItemProps {
  email: Email;
  folder: string;
  filter: EmailFilter;
  isSelected: boolean;
  onRefresh: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  emailCount?: number;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
}

function hasFlag(flags: Set<string> | string[] | unknown, flag: string): boolean {
  if (flags instanceof Set) return flags.has(flag);
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

    // Remove standalone long URLs (not in markdown link format) - they clutter the preview
    // But keep markdown links - they don't take up extra space
    text = text.replace(/(?<!\()(?<!\[)(https?:\/\/[^\s\n]{50,})(?!\))/g, "");

    // For compact view, collapse 3+ newlines to 2 for tighter display
    text = text.replace(/\n{3,}/g, "\n\n");
  } else {
    // For expanded view, allow max 2 consecutive newlines
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  return text.trim();
}

function EmailListItem({
  email,
  folder,
  filter,
  isSelected,
  onRefresh,
  onLoadMore,
  isLoadingMore,
  emailCount,
  demoMode,
  onToggleDemoMode,
}: EmailListItemProps) {
  const isUnread = !hasFlag(email.flags, "\\Seen");
  const fromDisplay = email.from[0]?.name || email.from[0]?.address || "Unknown";

  return (
    <List.Item
      id={email.uid.toString()}
      title={email.subject}
      subtitle={fromDisplay}
      icon={isUnread ? { source: Icon.Circle, tintColor: Color.Blue } : Icon.CheckCircle}
      accessories={[
        email.hasAttachment ? { icon: Icon.Paperclip } : {},
        { date: email.date, tooltip: email.date.toLocaleString() },
      ].filter((a) => Object.keys(a).length > 0)}
      detail={isSelected ? <EmailDetail email={email} folder={folder} demoMode={demoMode} /> : undefined}
      actions={
        <EmailActions
          email={email}
          folder={folder}
          filter={filter}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          emailCount={emailCount}
          demoMode={demoMode}
          onToggleDemoMode={onToggleDemoMode}
        />
      }
    />
  );
}

interface EmailDetailProps {
  email: Email;
  folder: string;
  demoMode?: boolean;
}

function EmailDetail({ email, folder, demoMode }: EmailDetailProps) {
  const { data: body, isLoading } = useCachedPromise(
    async (f: string, uid: number) => {
      return await fetchEmailBody(f, uid);
    },
    [folder, email.uid],
  );

  const fromDisplay = email.from.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const toDisplay = email.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const ccDisplay = email.cc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");

  // Build markdown with just the email body (metadata is shown below)
  // Skip images in list/detail view (includeImages=false) - they show in expanded view
  let markdown = "";

  if (isLoading) {
    markdown = `*Loading email content...*`;
  } else if (demoMode) {
    markdown = DEMO_BODY;
  } else if (body?.text) {
    markdown = cleanHtmlForDisplay(body.text, false);
  } else if (body?.html) {
    markdown = cleanHtmlForDisplay(body.html, false);
  } else {
    markdown = email.preview || "*No content available*";
  }

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Subject" text={email.subject} />
          <List.Item.Detail.Metadata.Label title="From" text={fromDisplay} />
          <List.Item.Detail.Metadata.Label title="To" text={toDisplay} />
          {ccDisplay && <List.Item.Detail.Metadata.Label title="CC" text={ccDisplay} />}
          <List.Item.Detail.Metadata.Label title="Date" text={email.date.toLocaleString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Status">
            {!hasFlag(email.flags, "\\Seen") && (
              <List.Item.Detail.Metadata.TagList.Item text="Unread" color={Color.Blue} />
            )}
            {email.hasAttachment && <List.Item.Detail.Metadata.TagList.Item text="Attachment" color={Color.Orange} />}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface ExpandedEmailViewProps {
  email: Email;
  folder: string;
  onRefresh?: () => void;
  initialDemoMode?: boolean;
}

function ExpandedEmailView({ email, folder, onRefresh, initialDemoMode }: ExpandedEmailViewProps) {
  const { push } = useNavigation();
  const [demoMode, setDemoMode] = useState(initialDemoMode || false);
  const { data: body, isLoading } = useCachedPromise(
    async (f: string, uid: number) => {
      return await fetchEmailBody(f, uid);
    },
    [folder, email.uid],
  );

  // Apply demo mode anonymization
  const displayEmail = demoMode ? anonymizeEmail(email, 0) : email;
  const fromDisplay = displayEmail.from.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const toDisplay = displayEmail.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const ccDisplay = displayEmail.cc?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const fromAddress = email.from[0]?.address || "";
  const isUnread = !hasFlag(email.flags, "\\Seen");

  let markdown = "";

  if (isLoading) {
    markdown = `*Loading email content...*`;
  } else if (demoMode) {
    markdown = DEMO_BODY;
  } else if (body?.text) {
    markdown = cleanHtmlForDisplay(body.text);
  } else if (body?.html) {
    markdown = cleanHtmlForDisplay(body.html);
  } else {
    markdown = email.preview || "*No content available*";
  }

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

  const handleMarkAsRead = async () => {
    try {
      await markAsRead(folder, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as read" });
      onRefresh?.();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as read", message: String(error) });
    }
  };

  const handleMarkAsUnread = async () => {
    try {
      await markAsUnread(folder, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as unread" });
      onRefresh?.();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as unread", message: String(error) });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveEmail(folder, email.uid);
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
        await deleteEmail(folder, email.uid);
        showToast({ style: Toast.Style.Success, title: "Deleted" });
        onRefresh?.();
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete", message: String(error) });
      }
    }
  };

  const handleOpenInProtonMail = async () => {
    const searchQuery = encodeURIComponent(email.subject);
    await open(`https://mail.proton.me/u/0/almost-all-mail#keyword=${searchQuery}`);
  };

  const handleDownloadAttachments = () => {
    push(<AttachmentList folder={folder} emailUid={email.uid} emailSubject={email.subject} />);
  };

  return (
    <Detail
      navigationTitle={displayEmail.subject}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Subject" text={displayEmail.subject} />
          <Detail.Metadata.Label title="From" text={fromDisplay} />
          <Detail.Metadata.Label title="To" text={toDisplay} />
          {ccDisplay && <Detail.Metadata.Label title="CC" text={ccDisplay} />}
          <Detail.Metadata.Label title="Date" text={displayEmail.date.toLocaleString()} />
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
            <Action
              title="Open in Proton Mail"
              icon={Icon.Globe}
              onAction={handleOpenInProtonMail}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
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
              content={`# ${displayEmail.subject}\n\n**From:** ${fromDisplay}\n**To:** ${toDisplay}${ccDisplay ? `\n**CC:** ${ccDisplay}` : ""}\n**Date:** ${displayEmail.date.toLocaleString()}\n\n---\n\n${markdown}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy Subject"
              content={displayEmail.subject}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Sender"
              content={fromDisplay}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Display">
            <Action
              title={demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
              icon={demoMode ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => setDemoMode(!demoMode)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface EmailActionsProps {
  email: Email;
  folder: string;
  filter: EmailFilter;
  onRefresh: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  emailCount?: number;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
}

function EmailActions({
  email,
  folder,
  filter,
  onRefresh,
  onLoadMore,
  isLoadingMore,
  emailCount,
  demoMode,
  onToggleDemoMode,
}: EmailActionsProps) {
  const { push } = useNavigation();
  const isUnread = !hasFlag(email.flags, "\\Seen");
  const fromAddress = email.from[0]?.address || "";

  // Fetch email body for compose form
  const getEmailBodyForCompose = async (): Promise<string> => {
    try {
      const body = await fetchEmailBody(folder, email.uid);
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
      const body = await fetchEmailBody(folder, email.uid);
      let bodyText = "";
      if (body?.text) {
        bodyText = cleanHtmlForDisplay(body.text);
      } else if (body?.html) {
        bodyText = cleanHtmlForDisplay(body.html);
      } else {
        bodyText = email.preview || "";
      }

      const markdown = `# ${email.subject}\n\n**From:** ${fromDisplay}\n**To:** ${toDisplay}${ccDisplay ? `\n**CC:** ${ccDisplay}` : ""}\n**Date:** ${email.date.toLocaleString()}\n\n---\n\n${bodyText}`;

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
    try {
      await markAsRead(folder, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as read" });
      onRefresh();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to mark as read", message: String(error) });
    }
  };

  const handleMarkAsUnread = async () => {
    try {
      await markAsUnread(folder, email.uid);
      showToast({ style: Toast.Style.Success, title: "Marked as unread" });
      onRefresh();
    } catch (error) {
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
        await deleteEmail(folder, email.uid);
        showToast({ style: Toast.Style.Success, title: "Email deleted" });
        onRefresh();
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to delete email", message: String(error) });
      }
    }
  };

  const handleArchive = async () => {
    try {
      await archiveEmail(folder, email.uid);
      showToast({ style: Toast.Style.Success, title: "Email archived" });
      onRefresh();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to archive email", message: String(error) });
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

  const handleOpenInProtonMail = async () => {
    // Use search URL with subject to find the email in Proton Mail web
    const searchQuery = encodeURIComponent(email.subject);
    await open(`https://mail.proton.me/u/0/almost-all-mail#keyword=${searchQuery}`);
  };

  const handleDownloadAttachments = () => {
    push(<AttachmentList folder={folder} emailUid={email.uid} emailSubject={email.subject} />);
  };

  const handleExpandEmail = () => {
    push(<ExpandedEmailView email={email} folder={folder} onRefresh={onRefresh} initialDemoMode={demoMode} />);
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
        <Action
          title="Open in Proton Mail"
          icon={Icon.Globe}
          onAction={handleOpenInProtonMail}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
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

      <ActionPanel.Section title="Quicklinks">
        <Action.CreateQuicklink
          title="Save Current View as Quicklink"
          quicklink={{
            name: `Proton Mail - ${folder}${filter !== "all" ? ` (${filter})` : ""}`,
            link: `raycast://extensions/NormC/proton-mail/list-emails?arguments=${encodeURIComponent(JSON.stringify({ folder, filter }))}`,
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
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

      {onToggleDemoMode && (
        <ActionPanel.Section title="Display">
          <Action
            title={demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
            icon={demoMode ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDemoMode}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
