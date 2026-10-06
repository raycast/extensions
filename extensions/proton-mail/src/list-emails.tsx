import { useState, useEffect, useCallback, useMemo } from "react";
import { mkdtemp, readdir, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
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
import { useCachedPromise, usePromise } from "@raycast/utils";
import {
  listFolders,
  fetchEmails,
  fetchEmailBody,
  markAsRead,
  markAsUnread,
  deleteEmail,
  deletesPermanently,
  archiveEmail,
  disconnectClient,
} from "./imap-client";
import { Email, Folder, EmailFilter } from "./types";
import { ComposeForm, ComposeMode } from "./compose-form";
import { AttachmentList } from "./attachment-list";
import { emailBodyToMarkdown } from "./email-markdown";

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
  const permanentDelete = deletesPermanently(selectedFolder, folders || []);

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
            deletesPermanently={permanentDelete}
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

// Bridge exposes Proton's message ID, so open the email itself; other servers fall back to a subject search
function protonMailUrl(email: Email): string {
  if (email.protonId) {
    return `https://mail.proton.me/u/0/almost-all-mail/${email.protonId}`;
  }
  return `https://mail.proton.me/u/0/almost-all-mail#keyword=${encodeURIComponent(email.subject)}`;
}

async function deleteWithFeedback(folder: string, email: Email, permanently: boolean): Promise<boolean> {
  if (permanently) {
    const confirmed = await confirmAlert({
      title: "Delete Permanently",
      message: `"${email.subject}" will be deleted for good. This can't be undone.`,
      primaryAction: { title: "Delete Permanently", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return false;
  }
  try {
    const result = await deleteEmail(folder, email.uid);
    showToast({ style: Toast.Style.Success, title: result === "trashed" ? "Moved to Trash" : "Deleted permanently" });
    return true;
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to delete email", message: String(error) });
    return false;
  }
}

interface EmailListItemProps {
  email: Email;
  folder: string;
  filter: EmailFilter;
  isSelected: boolean;
  deletesPermanently: boolean;
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Opening the original in the browser must not run the sender's code: block scripts, frames, plugins,
// forms and redirects, and only let through what the email needs to render (images, styles, fonts)
const ORIGINAL_EMAIL_CSP = [
  "default-src 'none'",
  "img-src * data:",
  "style-src * 'unsafe-inline'",
  "font-src * data:",
  "media-src * data:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");
const ORIGINAL_FILE_PREFIX = "proton-mail-original-";
// Long enough for the browser to load the file, which holds a decrypted email
const ORIGINAL_FILE_LIFETIME_MS = 60_000;

// Files left behind when the command closed before their timer fired
async function removeStaleOriginals() {
  const entries = await readdir(tmpdir());
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(ORIGINAL_FILE_PREFIX))
      .map(async (entry) => {
        const path = join(tmpdir(), entry);
        const { mtimeMs } = await stat(path);
        if (Date.now() - mtimeMs > ORIGINAL_FILE_LIFETIME_MS) {
          await rm(path, { recursive: true, force: true });
        }
      }),
  );
}

// Raycast can only render Markdown, so hand the original HTML to the browser for full fidelity
async function openOriginalInBrowser(folder: string, email: Email) {
  try {
    const { html: content } = await fetchEmailBody(folder, email.uid, { inlineImages: true });
    if (!content) {
      showToast({ style: Toast.Style.Failure, title: "No HTML version", message: "This email is plain text only" });
      return;
    }
    await removeStaleOriginals().catch(() => undefined);

    // A private, unique directory: mkdtemp creates it readable by the current user only
    const directory = await mkdtemp(join(tmpdir(), ORIGINAL_FILE_PREFIX));
    const filePath = join(directory, "email.html");
    const page =
      `<!doctype html><meta charset="utf-8">` +
      `<meta http-equiv="Content-Security-Policy" content="${ORIGINAL_EMAIL_CSP}">` +
      `<title>${escapeHtml(email.subject)}</title>` +
      // Meta refreshes are navigations, which the policy above doesn't cover
      content.replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh[^>]*>/gi, "");
    await writeFile(filePath, page, { mode: 0o600 });
    await open(filePath);
    setTimeout(() => rm(directory, { recursive: true, force: true }).catch(() => undefined), ORIGINAL_FILE_LIFETIME_MS);
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to open email", message: String(error) });
  }
}

function EmailListItem({
  email,
  folder,
  filter,
  isSelected,
  deletesPermanently,
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
          deletesPermanently={deletesPermanently}
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
  // Bodies stay in memory only: persisting them would write decrypted emails to disk
  const { data: body, isLoading } = usePromise(
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
  const bodyMarkdown = useMemo(() => body && emailBodyToMarkdown(body, { images: false }), [body]);

  let markdown = "";

  if (isLoading) {
    markdown = `*Loading email content...*`;
  } else if (demoMode) {
    markdown = DEMO_BODY;
  } else {
    markdown = bodyMarkdown || email.preview || "*No content available*";
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
  deletesPermanently?: boolean;
}

function ExpandedEmailView({
  email,
  folder,
  onRefresh,
  initialDemoMode,
  deletesPermanently = false,
}: ExpandedEmailViewProps) {
  const { push } = useNavigation();
  const { loadRemoteImages } = getPreferenceValues<Preferences>();
  const [demoMode, setDemoMode] = useState(initialDemoMode || false);
  // Bodies stay in memory only: persisting them would write decrypted emails to disk
  const { data: body, isLoading } = usePromise(
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

  const bodyMarkdown = useMemo(
    () => body && emailBodyToMarkdown(body, { images: loadRemoteImages }),
    [body, loadRemoteImages],
  );

  let markdown = "";

  if (isLoading) {
    markdown = `*Loading email content...*`;
  } else if (demoMode) {
    markdown = DEMO_BODY;
  } else {
    markdown = bodyMarkdown || email.preview || "*No content available*";
  }

  const getEmailBodyForCompose = async (): Promise<string> => {
    return body?.text || body?.html || email.preview || "";
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
    if (await deleteWithFeedback(folder, email, deletesPermanently)) {
      onRefresh?.();
    }
  };

  const handleOpenInProtonMail = async () => {
    await open(protonMailUrl(email));
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
            {body?.html && (
              <Action
                title="Open Original in Browser"
                icon={Icon.Window}
                onAction={() => openOriginalInBrowser(folder, email)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            )}
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
              title={deletesPermanently ? "Delete Permanently" : "Move to Trash"}
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
  deletesPermanently: boolean;
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
  deletesPermanently,
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
      return body.text || body.html || email.preview || "";
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
      const { loadRemoteImages } = getPreferenceValues<Preferences>();
      const bodyText = emailBodyToMarkdown(body, { images: loadRemoteImages }) || email.preview || "";

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
    if (await deleteWithFeedback(folder, email, deletesPermanently)) {
      onRefresh();
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
    await open(protonMailUrl(email));
  };

  const handleDownloadAttachments = () => {
    push(<AttachmentList folder={folder} emailUid={email.uid} emailSubject={email.subject} />);
  };

  const handleExpandEmail = () => {
    push(
      <ExpandedEmailView
        email={email}
        folder={folder}
        onRefresh={onRefresh}
        initialDemoMode={demoMode}
        deletesPermanently={deletesPermanently}
      />,
    );
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
        <Action
          title="Open Original in Browser"
          icon={Icon.Window}
          onAction={() => openOriginalInBrowser(folder, email)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
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
          title={deletesPermanently ? "Delete Permanently" : "Move to Trash"}
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
            link: `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/NormC/proton-mail/list-emails?arguments=${encodeURIComponent(JSON.stringify({ folder, filter }))}`,
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
