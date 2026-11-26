import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  getAvatarIcon,
  getFavicon,
  MutatePromise,
  showFailureToast,
  useCachedPromise,
  useForm,
  useLocalStorage,
  usePromise,
} from "@raycast/utils";
import {
  Address,
  ALL_MAIL,
  archiveEmail,
  Attachment,
  Email,
  getEmailContent,
  getMailboxes,
  getToken,
  INBOX,
  InvalidTokenError,
  listEmails,
  Mailbox,
  openAttachment,
  ReadOnlyTokenError,
  removeOldAttachments,
  reportSpam,
  restoreEmail,
  saveToken,
  setRead,
  TOKEN_SETTINGS_URL,
  trashEmail,
} from "./util/jmap";
import { demoFavicon } from "./util/demo";
import { registrableDomain } from "./util/domain";
import { detectLoginInfo, LoginInfo, looksLikeLogin } from "./util/login";

const DEBOUNCE_MS = 300;

type ActionResult = "done" | "failed" | "signedOut";

type MailActions = {
  archive: (email: Email) => Promise<ActionResult>;
  reportSpam: (email: Email) => Promise<ActionResult>;
  trash: (email: Email) => Promise<ActionResult>;
  setRead: (email: Email, read: boolean, options?: { silent?: boolean }) => Promise<ActionResult>;
};

export default function SearchEmail() {
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState(INBOX);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: token, isLoading: isLoadingToken, revalidate: reloadToken } = usePromise(getToken);
  const { value: isShowingDetail, setValue: setShowingDetail } = useLocalStorage("isShowingDetail", false);
  // The token is an argument so switching accounts reloads the folders.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: mailboxes } = useCachedPromise((_token: string | undefined) => getMailboxes(), [token], {
    execute: Boolean(token),
  });
  const { data, isLoading, error, revalidate, mutate, pagination } = useCachedPromise(
    // The token is a dependency so saving a new one refetches.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (q: string, f: string, _token: string | undefined) =>
      async ({ page }: { page: number }) => {
        const { emails, hasMore } = await listEmails(f, q, page);
        return { data: emails, hasMore };
      },
    [query, folder, token],
    {
      execute: Boolean(token),
      keepPreviousData: true,
      failureToastOptions: { title: "Couldn't load email" },
    },
  );

  // Select the first email when new results arrive, but not after archiving etc.
  const [selectedId, setSelectedId] = useState<string>();
  const [resetFor, setResetFor] = useState<string>();
  useEffect(() => {
    const key = `${folder}\n${query}`;
    if (!isLoading && data && resetFor !== key) {
      setResetFor(key);
      setSelectedId(data[0]?.id);
    }
  }, [data, isLoading, query, folder]);

  const { data: loginInfo } = usePromise(
    (emails: Email[]) => detectLoginInfo(emails.filter(looksLikeLogin)),
    [data ?? []],
    { execute: Boolean(token) },
  );

  useEffect(() => {
    removeOldAttachments().catch(() => undefined);
  }, []);

  if (isLoadingToken) return <List isLoading />;
  if (!token || error instanceof InvalidTokenError) {
    return <TokenForm invalid={Boolean(token)} onSaved={reloadToken} />;
  }

  const mailActions = buildMailActions(mutate, query !== "" || folder !== INBOX, revalidate);
  const failedToLoad = error && !data?.length;
  const folderName =
    folder === INBOX
      ? query
        ? "All Mail"
        : "Inbox"
      : folder === ALL_MAIL
        ? "All Mail"
        : mailboxes?.find((m) => m.id === folder)?.name;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      filtering={false}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search mail (from:, subject:, is:unread, has:attachment)"
      searchBarAccessory={<FolderDropdown mailboxes={mailboxes ?? []} onChange={setFolder} />}
    >
      {failedToLoad ? (
        <List.EmptyView
          title="Couldn't load email"
          description={error.message}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title={query ? "No emails found" : `${folderName ?? "Folder"} is empty`}
          icon={query ? Icon.MagnifyingGlass : Icon.Tray}
        />
      )}
      <List.Section title={query ? `Search Results in ${folderName}` : folderName}>
        {(data ?? []).map((email) => (
          <EmailItem
            key={email.id}
            email={email}
            login={loginInfo?.get(email.id)}
            mailActions={mailActions}
            isSelected={email.id === selectedId}
            isShowingDetail={Boolean(isShowingDetail)}
            onToggleDetail={() => setShowingDetail(!isShowingDetail)}
            onReload={revalidate}
            onTokenChanged={reloadToken}
          />
        ))}
      </List.Section>
    </List>
  );
}

function FolderDropdown({ mailboxes, onChange }: { mailboxes: Mailbox[]; onChange: (folder: string) => void }) {
  const others = mailboxes
    .filter((m) => m.role !== "inbox")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return (
    <List.Dropdown tooltip="Folder" storeValue onChange={onChange}>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Inbox" value={INBOX} icon={Icon.Tray} />
        <List.Dropdown.Item title="All Mail" value={ALL_MAIL} icon={Icon.Envelope} />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {others.map((m) => (
          <List.Dropdown.Item key={m.id} title={m.name} value={m.id} icon={mailboxIcon(m)} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function mailboxIcon(mailbox: Mailbox): Icon {
  switch (mailbox.role) {
    case "archive":
      return Icon.Box;
    case "sent":
      return Icon.Airplane;
    case "drafts":
      return Icon.Pencil;
    case "junk":
      return Icon.ExclamationMark;
    case "trash":
      return Icon.Trash;
    default:
      return Icon.Folder;
  }
}

function buildMailActions(
  mutate: MutatePromise<Email[]>,
  // A search or folder can depend on what changed (is:unread, in:archive), so it reloads afterwards.
  filtered: boolean,
  // Reloading with a revoked token swaps the list for the token form.
  reload: () => void,
): MailActions {
  const without = (email: Email) => (list: Email[]) => list.filter((e) => e.id !== email.id);

  const perform = async (
    request: Promise<void>,
    optimisticUpdate: (list: Email[]) => Email[],
    { success, silent = false, undo }: { success: string; silent?: boolean; undo?: () => Promise<void> },
  ): Promise<ActionResult> => {
    try {
      await mutate(request, { optimisticUpdate, shouldRevalidateAfter: filtered });
      if (!silent) {
        await showToast({
          style: Toast.Style.Success,
          title: success,
          primaryAction: undo && {
            title: "Undo",
            shortcut: { modifiers: ["cmd"], key: "z" },
            onAction: async (toast) => {
              toast.style = Toast.Style.Animated;
              toast.title = "Undoing…";
              try {
                await undo();
                reload();
                await toast.hide();
              } catch (error) {
                await showFailureToast(error, { title: "Couldn't undo" });
              }
            },
          },
        });
      }
      return "done";
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        reload();
        await showFailureToast(error, { title: "Your API token no longer works" });
        return "signedOut";
      }
      if (silent) return "failed";
      if (error instanceof ReadOnlyTokenError) {
        await showFailureToast(error, {
          title: "Your API token is read-only",
          message: "Create a token with write access, then use Change Fastmail Token.",
          primaryAction: { title: "Create Token in Fastmail", onAction: () => open(TOKEN_SETTINGS_URL) },
        });
      } else {
        await showFailureToast(error, { title: "Couldn't update email" });
      }
      return "failed";
    }
  };

  return {
    // Archived mail still matches a search or All Mail, so only drop it when viewing the inbox.
    archive: (email) =>
      perform(archiveEmail(email.id), filtered ? (list) => list : without(email), {
        success: "Archived",
        undo: () => restoreEmail(email),
      }),
    reportSpam: (email) =>
      perform(reportSpam(email.id), without(email), { success: "Reported as spam", undo: () => restoreEmail(email) }),
    trash: (email) =>
      perform(trashEmail(email.id), without(email), { success: "Moved to Trash", undo: () => restoreEmail(email) }),
    setRead: (email, read, { silent } = {}) =>
      perform(setRead(email.id, read), (list) => list.map((e) => (e.id === email.id ? { ...e, unread: !read } : e)), {
        success: read ? "Marked as read" : "Marked as unread",
        silent,
      }),
  };
}

function TokenForm({ invalid, onSaved }: { invalid: boolean; onSaved: () => void }) {
  const { handleSubmit, itemProps, setValidationError } = useForm<{ token: string }>({
    validation: {
      token: (value) => {
        const token = value?.trim() ?? "";
        if (!token) return "Paste your API token";
        if (token.includes("…")) return "This token is shortened (it contains …). Copy the full token from Fastmail.";
        if (!/^[\x21-\x7e]+$/.test(token))
          return "This doesn't look like a Fastmail token. Copy the full token from Fastmail.";
      },
    },
    onSubmit: async ({ token }) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Checking token…" });
      try {
        await saveToken(token);
        toast.style = Toast.Style.Success;
        toast.title = "Connected to Fastmail";
        onSaved();
      } catch (error) {
        await toast.hide();
        if (error instanceof InvalidTokenError) {
          setValidationError("token", "Fastmail rejected this token");
        } else {
          await showFailureToast(error, { title: "Couldn't reach Fastmail" });
        }
      }
    },
  });

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory target={TOKEN_SETTINGS_URL} text="Create token in Fastmail" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Token" icon={Icon.Key} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Create Token in Fastmail"
            url={TOKEN_SETTINGS_URL}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={invalid ? "Token Rejected" : "Connect Fastmail"}
        text={
          (invalid ? "Your saved API token no longer works. " : "") +
          "Press ⌘O to open Fastmail's API token settings, then click New API token."
        }
      />
      <Form.Description
        title="Token Settings"
        text={
          "Name it Raycast and tick Email. Leave Read-only unticked if you want to archive, delete and report spam from Raycast. Then copy the token (it starts with fmu1-) and paste it below. It's stored encrypted on this Mac and only sent to Fastmail."
        }
      />
      <Form.PasswordField {...itemProps.token} title="API Token" placeholder="fmu1-..." autoFocus />
    </Form>
  );
}

type EmailActionsProps = {
  email: Email;
  login?: LoginInfo;
  mailActions: MailActions;
  isShowingDetail?: boolean;
  onToggleDetail?: () => void;
  onReload: () => void;
  onTokenChanged: () => void;
};

function EmailItem(props: EmailActionsProps & { isSelected: boolean; isShowingDetail: boolean }) {
  const { email, login, isSelected, isShowingDetail } = props;
  const sender = email.from ? email.from.name || email.from.email : "Unknown sender";

  const accessories: List.Item.Accessory[] = [];
  if (email.unread) accessories.push({ icon: { source: Icon.CircleFilled, tintColor: Color.Blue }, tooltip: "Unread" });
  if (login?.code) accessories.push({ tag: { value: login.code, color: Color.Green }, tooltip: "Code (⌘⇧C to copy)" });
  if (login?.link)
    accessories.push({ icon: { source: Icon.Link, tintColor: Color.Green }, tooltip: "Login link (⌘⇧O)" });
  if (email.attachments.length > 0) accessories.push({ icon: Icon.Paperclip, tooltip: "Attachments" });
  accessories.push({ date: email.receivedAt, tooltip: email.receivedAt.toLocaleString() });

  return (
    <List.Item
      id={email.id}
      icon={senderIcon(email.from, sender)}
      title={email.subject}
      subtitle={isShowingDetail ? undefined : sender}
      accessories={accessories}
      // Only the selected email loads its body, so scrolling the list stays fast.
      detail={
        isShowingDetail && (isSelected ? <EmailPreview email={email} /> : <List.Item.Detail markdown={email.preview} />)
      }
      actions={<EmailActions {...props} />}
    />
  );
}

function EmailPreview({ email }: { email: Email }) {
  const { data: content, isLoading } = usePromise(getEmailContent, [email.id]);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={emailMarkdown(email, content?.body)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="From" text={formatAddress(email.from)} />
          <List.Item.Detail.Metadata.Label title="To" text={email.to.map(formatAddress).join(", ")} />
          <List.Item.Detail.Metadata.Label title="Received" text={email.receivedAt.toLocaleString()} />
          {email.attachments.map((a) => (
            <List.Item.Detail.Metadata.Label
              key={a.blobId}
              title="Attachment"
              text={a.name ?? "Unnamed"}
              icon={Icon.Paperclip}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function EmailView(props: EmailActionsProps) {
  const [email, setEmail] = useState(props.email);
  const { pop } = useNavigation();
  const { data: content, isLoading } = usePromise(getEmailContent, [email.id]);

  const setReadAndTrack: MailActions["setRead"] = async (target, read, options) => {
    const result = await props.mailActions.setRead(target, read, options);
    if (result === "done") setEmail((current) => ({ ...current, unread: !read }));
    // The list behind this view now shows the token form.
    if (result === "signedOut") pop();
    return result;
  };

  useEffect(() => {
    if (props.email.unread) setReadAndTrack(props.email, true, { silent: true });
  }, []);

  const mailActions: MailActions = { ...props.mailActions, setRead: setReadAndTrack };

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={email.subject}
      markdown={emailMarkdown(email, content?.body)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={formatAddress(email.from)} />
          <Detail.Metadata.Label title="To" text={email.to.map(formatAddress).join(", ")} />
          <Detail.Metadata.Label title="Received" text={email.receivedAt.toLocaleString()} />
          {email.attachments.map((a) => (
            <Detail.Metadata.Label key={a.blobId} title="Attachment" text={a.name ?? "Unnamed"} icon={Icon.Paperclip} />
          ))}
        </Detail.Metadata>
      }
      actions={<EmailActions {...props} email={email} mailActions={mailActions} />}
    />
  );
}

function EmailActions(props: EmailActionsProps) {
  const { email, login, mailActions, isShowingDetail, onToggleDetail, onReload, onTokenChanged } = props;
  const { pop } = useNavigation();
  const inList = Boolean(onToggleDetail);

  // In the email view, go back to the list once the email is gone from it (or the token is).
  const thenPop = (action: (email: Email) => Promise<ActionResult>) => async () => {
    if ((await action(email)) !== "failed" && !inList) pop();
  };

  const loginActions = [
    login?.code && (
      <Action.CopyToClipboard
        key="code"
        title={`Copy Code ${login.code}`}
        content={login.code}
        concealed
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    ),
    login?.link && (
      <Action.OpenInBrowser
        key="link"
        title="Open Login Link"
        url={login.link}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    ),
  ].filter(Boolean);
  const openInFastmail = (
    <Action.OpenInBrowser title="Open in Fastmail" url={email.webUrl} shortcut={Keyboard.Shortcut.Common.Open} />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {inList && (
          <Action.Push
            title="Show Email"
            icon={Icon.Envelope}
            target={<EmailView {...props} isShowingDetail={undefined} onToggleDetail={undefined} />}
          />
        )}
        {loginActions}
        {openInFastmail}
        <LinksSubmenu email={email} />
        {email.attachments.length > 0 && <AttachmentsSubmenu attachments={email.attachments} />}
        {onToggleDetail && (
          <Action
            title={isShowingDetail ? "Hide Preview" : "Show Preview"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Archive"
          icon={Icon.Box}
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={thenPop(mailActions.archive)}
        />
        <Action
          title={email.unread ? "Mark as Read" : "Mark as Unread"}
          icon={email.unread ? Icon.CheckCircle : Icon.Circle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          onAction={() => mailActions.setRead(email, email.unread)}
        />
        <Action
          title="Report Spam"
          icon={Icon.ExclamationMark}
          shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          onAction={thenPop(mailActions.reportSpam)}
        />
        <Action
          title="Move to Trash"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={thenPop(mailActions.trash)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy Body"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          onAction={async () => {
            try {
              await Clipboard.copy((await getEmailContent(email.id)).body);
              await showHUD("Copied body");
            } catch (error) {
              await showFailureToast(error, { title: "Couldn't load email" });
            }
          }}
        />
        {email.from && (
          <Action.CopyToClipboard
            title="Copy Sender Address"
            content={email.from.email}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Reload"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onReload}
        />
        <Action.Push
          title="Change Fastmail Token"
          icon={Icon.Key}
          target={
            <TokenForm
              invalid={false}
              onSaved={() => {
                pop();
                onTokenChanged();
              }}
            />
          }
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// Links need the body, so they load when the submenu opens.
function LinksSubmenu({ email }: { email: Email }) {
  const [load, setLoad] = useState(false);
  const { data: content, isLoading } = usePromise(getEmailContent, [email.id], { execute: load });
  return (
    <ActionPanel.Submenu
      title="Open Link"
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      isLoading={isLoading}
      onOpen={() => setLoad(true)}
    >
      {content?.links.map((link) => (
        <Action.OpenInBrowser key={link.url} title={truncate(link.title, 80)} url={link.url} />
      ))}
    </ActionPanel.Submenu>
  );
}

function AttachmentsSubmenu({ attachments }: { attachments: Attachment[] }) {
  const openOne = async (attachment: Attachment) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${attachment.name ?? "attachment"}…`,
    });
    try {
      await open(await openAttachment(attachment));
      await toast.hide();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't open attachment" });
    }
  };
  return (
    <ActionPanel.Submenu
      title="Open Attachment"
      icon={Icon.Paperclip}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    >
      {attachments.map((attachment) => (
        <Action
          key={attachment.blobId}
          title={`${attachment.name ?? "Unnamed"} (${formatSize(attachment.size)})`}
          icon={Icon.Document}
          onAction={() => openOne(attachment)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function emailMarkdown(email: Email, body: string | undefined): string {
  return `## ${escapeMarkdown(email.subject)}\n\n${body ?? email.preview}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
  "fastmail.com",
  "fastmail.fm",
  "hey.com",
]);

// Company mail gets the site's favicon; people on personal mail domains get an initials avatar.
function senderIcon(from: Address | null, sender: string): Image.ImageLike {
  const avatar = getAvatarIcon(sender);
  const domain = from?.email.split("@")[1]?.toLowerCase();
  if (!domain || PERSONAL_DOMAINS.has(domain)) return avatar;
  // .example is reserved for made-up addresses, like the demo mode's.
  if (domain.endsWith(".example")) return demoFavicon(domain) ?? avatar;
  return getFavicon(`https://${registrableDomain(domain)}`, { fallback: avatar, mask: Image.Mask.RoundedRectangle });
}

function formatAddress(address: Address | null): string {
  if (!address) return "";
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]#<>])/g, "\\$1");
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
