// Mail command: inbox of SMTP messages captured by Yerd's mail sink.
// List → detail via `mail show <id>`; text_body is rendered fenced, with a
// sentinel for HTML-only messages (no tag stripping). Clear is always guarded
// by confirmAlert. The empty state surfaces the LIVE mail port from status —
// never a hardcoded 2525 (that value is a fallback only).

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { runYerd, TIMEOUTS } from "./yerd/cli";
import type {
  MailListResponse,
  MailShowResponse,
  StatusResponse,
} from "./yerd/types";

function userMessage(e: unknown): string {
  const msg = (e as { userMessage?: string }).userMessage;
  return msg ?? "Yerd command failed";
}

function formatRelativeDate(epoch: number): string {
  const diff = Date.now() / 1000 - epoch;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function MailDetailView({ id }: { id: string }) {
  const { isLoading, data } = useCachedPromise(
    (mailId: string) => runYerd<MailShowResponse>(["mail", "show", mailId]),
    [id],
    { keepPreviousData: true },
  );
  const mail = data?.mail;

  // text_body used directly; html_body sentinel when text is empty/null
  const body = mail?.text_body
    ? `\`\`\`\n${mail.text_body}\n\`\`\``
    : mail?.html_body
      ? "*(HTML-only message — open in the Yerd app to view)*"
      : "*(empty)*";

  const md = mail
    ? `# ${mail.subject}\n\n**From:** ${mail.from}  \n**To:** ${mail.to.join(", ")}  \n**Date:** ${new Date(mail.date_epoch * 1000).toLocaleString()}\n\n---\n\n${body}`
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          {mail && (
            <Action.CopyToClipboard
              title="Copy Subject"
              content={mail.subject}
            />
          )}
          {mail?.text_body && (
            <Action.CopyToClipboard
              title="Copy Body"
              content={mail.text_body}
            />
          )}
          {mail && (
            <Action.CopyToClipboard
              title="Copy Recipient"
              content={mail.to.join(", ")}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Mail() {
  const {
    isLoading: mailLoading,
    data: mailData,
    revalidate,
  } = useCachedPromise(() => runYerd<MailListResponse>(["mail", "list"]), [], {
    keepPreviousData: true,
  });

  const { data: statusData } = useCachedPromise(
    () => runYerd<StatusResponse>(["status"]),
    [],
    {
      keepPreviousData: true,
    },
  );

  const mails = mailData?.mails ?? [];
  const mailPort = statusData?.report?.mail?.port ?? 2525;

  async function clearAll() {
    const ok = await confirmAlert({
      title: "Clear All Messages?",
      message: "All captured mail will be permanently deleted.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing mail…",
    });
    try {
      await runYerd(["mail", "clear"], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = "Mail cleared";
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: userMessage(e) });
    }
  }

  return (
    <List isLoading={mailLoading} searchBarPlaceholder="Search mail…">
      {mails.length === 0 ? (
        <List.EmptyView
          title="No captured mail"
          description={`Point your app's SMTP at 127.0.0.1:${mailPort} (see yerd.app/guide/mail)`}
          icon={Icon.Envelope}
        />
      ) : (
        <List.Section
          title={`${mails.length} message${mails.length !== 1 ? "s" : ""}`}
        >
          {mails.map((mail) => (
            <List.Item
              key={mail.id}
              title={mail.subject || "(no subject)"}
              subtitle={mail.from}
              accessories={[
                { text: formatRelativeDate(mail.date_epoch) },
                ...(!mail.read
                  ? [{ icon: { source: Icon.Circle, tintColor: Color.Blue } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Message"
                    icon={Icon.Envelope}
                    target={<MailDetailView id={mail.id} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Subject"
                    content={mail.subject}
                  />
                  <Action.CopyToClipboard
                    title="Copy Sender"
                    content={mail.from}
                  />
                  <Action
                    title="Clear All Messages"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearAll}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
