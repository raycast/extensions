import { Color, Image, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { ReactNode, memo, useCallback, useRef, useState } from "react";
import { rowColor, useAccountColors } from "../lib/accounts";
import { CachedContact, avatarIcon, contactFor, useContacts } from "../lib/contacts";
import { sparkIcon } from "../lib/sparkIcons";
import { sparkJSON } from "../lib/spark";
import { Address, EmailFlag, EmailSummary, EmailsResult, displayName, formatAddress, toDate } from "../lib/types";
import EmailActions from "./EmailActions";
import ErrorView from "./ErrorView";
import { useRefreshNotice } from "../lib/ui";

// Spark takes the same time for a page of 1 or of 100 emails (about a second
// for the Inbox), so pages are large: scrolling waits for a new page less
// often. Senders are looked up in the background in list order, so the rows
// on screen get their photos first.
const PAGE_SIZE = 50;

interface Props {
  /// `spark` arguments without paging, e.g. ["emails", "--filter", "is:unread"].
  args: string[];
  navigationTitle?: string;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isInvitation?: boolean;
  isNewSender?: boolean;
  emptyTitle?: string;
  /// Header section, e.g. a "New Senders" notice.
  header?: ReactNode;
  /// Shows the last page from the previous session while reloading - for the
  /// Inbox, which is opened often and changes little between looks.
  cached?: boolean;
}

export default function EmailList({
  args,
  navigationTitle,
  searchBarAccessory,
  isInvitation,
  isNewSender,
  emptyTitle,
  header,
  cached = false,
}: Props) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // `cached` is fixed for a list's lifetime, so the same hook runs on every
  // render.
  const useEmails = (cached ? useCachedPromise : usePromise) as typeof usePromise;
  const { data, isLoading, error, pagination, revalidate } = useEmails(
    (base: string[]) =>
      async ({ page }: { page: number }) => {
        const result = await sparkJSON<EmailsResult>([
          ...base,
          "--page",
          String(page + 1),
          "--page-size",
          String(PAGE_SIZE),
        ]);
        return { data: result.emails, hasMore: result.page.page < result.page.total_pages };
      },
    [args],
    { onError: () => undefined, ...(cached && { keepPreviousData: true }) },
  );

  const emails = (data ?? []).filter((email) => !removed.has(String(email.id)));
  const remove = useCallback((id: string) => setRemoved((current) => new Set(current).add(id)), []);
  const { contacts, refresh } = useContacts(emails.map((email) => email.from[0]?.email ?? ""));
  const colors = useAccountColors();
  // Rows are memoized, so the callbacks they get must keep their identity.
  const latestRevalidate = useRef(revalidate);
  latestRevalidate.current = revalidate;
  const onChanged = useCallback(() => latestRevalidate.current(), []);

  useRefreshNotice(error, emails.length > 0, revalidate);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Filter by subject or sender"
      searchBarAccessory={searchBarAccessory}
      pagination={pagination && { ...pagination, pageSize: PAGE_SIZE }}
    >
      {/* Mounted even over cached emails: when Spark can't be reached at all,
          it hands the command the setup screen. */}
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={sparkIcon("SystemFolderInbox", Color.SecondaryText)} title={emptyTitle ?? "No emails"} />
      )}
      {header}
      {emails.map((email) => (
        <EmailRow
          key={email.id}
          email={email}
          sender={contactFor(contacts, email.from[0]?.email)}
          ring={rowColor(colors, email.account)}
          isInvitation={isInvitation}
          isNewSender={isNewSender}
          onChanged={onChanged}
          onRemoved={remove}
          onSenderChanged={refresh}
        />
      ))}
    </List>
  );
}

interface RowProps {
  email: EmailSummary;
  sender: CachedContact | null | undefined;
  ring: string | undefined;
  isInvitation?: boolean;
  isNewSender?: boolean;
  onChanged: () => void;
  onRemoved: (id: string) => void;
  onSenderChanged: (email: string) => void;
}

/// One email. Every update to the list - a page loading, a sender's photo
/// arriving - is sent on to Raycast, so a row redraws only when what it shows
/// has changed.
const EmailRow = memo(function EmailRow({
  email,
  sender,
  ring,
  isInvitation,
  isNewSender,
  onChanged,
  onRemoved,
  onSenderChanged,
}: RowProps) {
  const id = String(email.id);
  return (
    <List.Item
      id={id}
      icon={rowIcon(avatarIcon(email.from[0], sender, { ring }), email.account)}
      title={senderTitle(email.from[0])}
      subtitle={subjectLine(email.subject, email.flags)}
      keywords={[email.subject ?? "", ...email.from.map((a) => a.email), email.account ?? ""]}
      accessories={emailAccessories({
        flags: email.flags,
        isComment: email.is_comment,
        date: email.date,
      })}
      actions={
        <EmailActions
          email={{ id, subject: email.subject ?? "", fromEmail: email.from[0]?.email, flags: email.flags }}
          isInvitation={isInvitation}
          isNewSender={isNewSender}
          onChanged={onChanged}
          onRemoved={onRemoved}
          sender={sender}
          onSenderChanged={onSenderChanged}
        />
      }
    />
  );
}, sameRow);

/// A reloaded page brings new objects for unchanged emails, so they're compared
/// by content.
function sameRow(previous: RowProps, next: RowProps): boolean {
  return (
    previous.sender === next.sender &&
    previous.ring === next.ring &&
    previous.isInvitation === next.isInvitation &&
    previous.isNewSender === next.isNewSender &&
    previous.onChanged === next.onChanged &&
    previous.onRemoved === next.onRemoved &&
    previous.onSenderChanged === next.onSenderChanged &&
    (previous.email === next.email || JSON.stringify(previous.email) === JSON.stringify(next.email))
  );
}

/// The sender's name, with the full address on hover - Spark's first column.
export function senderTitle(sender: Address | undefined): List.Item.Props["title"] {
  if (!sender) return "(unknown sender)";
  return { value: displayName(sender), tooltip: formatAddress(sender) };
}

/// The subject, led by the state icon Spark shows before it. The list only
/// reports snoozing; pinned and priority aren't in it.
export function subjectLine(subject: string | undefined, flags: EmailFlag[]): string {
  return `${flags.includes("snoozed") ? "🕒 " : ""}${subject || "(no subject)"}`;
}

/// The row icon, with the account or shared inbox the email came to on hover.
export function rowIcon(image: Image.ImageLike, receivedAt: string | undefined): List.Item.Props["icon"] {
  return receivedAt ? { value: image, tooltip: `To ${receivedAt}` } : image;
}

/// Flag icons, then the date - led by Spark's blue dot when unread. The account
/// the email came to is the avatar's colored ring (and its tooltip).
export function emailAccessories(email: {
  flags: EmailFlag[];
  isComment?: boolean;
  date?: string;
}): List.Item.Accessory[] {
  const { flags } = email;
  const accessories: List.Item.Accessory[] = [];
  if (flags.includes("draft")) accessories.push({ icon: sparkIcon("Draft", Color.SecondaryText), tooltip: "Draft" });
  if (email.isComment) accessories.push({ icon: sparkIcon("Comment", Color.SecondaryText), tooltip: "Team comment" });
  // Spark calls a starred email pinned, and shows it with its pin.
  if (flags.includes("starred")) accessories.push({ icon: sparkIcon("Pin"), tooltip: "Pinned" });
  if (flags.includes("attachment")) {
    accessories.push({ icon: sparkIcon("Attachment", Color.SecondaryText), tooltip: "Attachment" });
  }
  if (flags.includes("replied"))
    accessories.push({ icon: sparkIcon("Reply", Color.SecondaryText), tooltip: "Replied" });
  const date = toDate(email.date);
  const unread = flags.includes("unread");
  accessories.push({
    date,
    icon: unread ? sparkIcon("UnreadDot", Color.Blue) : undefined,
    tooltip: [unread ? "Unread" : undefined, date?.toLocaleString()].filter(Boolean).join(" · "),
  });
  return accessories;
}
