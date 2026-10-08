import { useMemo, useState } from "react";
import { ActionPanel, Action, Color, Detail, getPreferenceValues, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { cachedEmailBody, EmailBody, fetchEmailBody } from "./imap-client";
import { emailBodyToMarkdown } from "./email-markdown";
import { emailAsMarkdown, emailHeaderMarkdown, formatAddresses, isRead, withRead } from "./email-format";
import { EmailContext, ManageActions, RespondActions } from "./email-actions";
import { openOriginalInBrowser } from "./open-original";
import { anonymizeEmail, DEMO_BODY } from "./demo";
import { Email } from "./types";

// Bodies stay in memory only (usePromise, not useCachedPromise): persisting them would write decrypted emails to
// disk. A body opened recently shows right away.
function useEmailBody(folder: string, uid: number): { body?: EmailBody; isLoading: boolean } {
  const cached = cachedEmailBody(folder, uid);
  const { data, isLoading } = usePromise(fetchEmailBody, [folder, uid], { execute: !cached });
  return { body: cached ?? data, isLoading: !cached && isLoading };
}

function bodyText(markdown: string | undefined, isLoading: boolean, demoMode?: boolean): string {
  if (isLoading) return "*Loading email content...*";
  if (demoMode) return DEMO_BODY;
  return markdown || "*No content available*";
}

// Preview of the selected email next to the list (⌘D)
export function EmailDetail({ email, folder, demoMode }: { email: Email; folder: string; demoMode?: boolean }) {
  const { body, isLoading } = useEmailBody(folder, email.uid);
  // Images show in the expanded view only
  const bodyMarkdown = useMemo(() => body && emailBodyToMarkdown(body, { images: false }), [body]);

  return (
    <List.Item.Detail
      markdown={bodyText(bodyMarkdown, isLoading, demoMode)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Subject" text={email.subject} />
          <List.Item.Detail.Metadata.Label title="From" text={formatAddresses(email.from)} />
          <List.Item.Detail.Metadata.Label title="To" text={formatAddresses(email.to)} />
          {!!email.cc?.length && <List.Item.Detail.Metadata.Label title="CC" text={formatAddresses(email.cc)} />}
          <List.Item.Detail.Metadata.Label title="Date" text={new Date(email.date).toLocaleString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Status">
            {isRead(email) ? (
              <List.Item.Detail.Metadata.TagList.Item text="Read" color={Color.Green} />
            ) : (
              <List.Item.Detail.Metadata.TagList.Item text="Unread" color={Color.Blue} />
            )}
            {email.hasAttachment && <List.Item.Detail.Metadata.TagList.Item text="Attachment" color={Color.Orange} />}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function ExpandedEmailView({
  email,
  context,
  initialDemoMode = false,
}: {
  email: Email;
  context: EmailContext;
  initialDemoMode?: boolean;
}) {
  const { pop } = useNavigation();
  const { loadRemoteImages } = getPreferenceValues<Preferences.ListEmails>();
  const [demoMode, setDemoMode] = useState(initialDemoMode);
  // The email was pushed as it was then: keep its read state here so the action title follows
  const [read, setRead] = useState(isRead(email));
  const { body, isLoading } = useEmailBody(context.folder, email.uid);
  const bodyMarkdown = useMemo(
    () => body && emailBodyToMarkdown(body, { images: loadRemoteImages }),
    [body, loadRemoteImages],
  );

  const current = withRead(email, read);
  const displayEmail = demoMode ? anonymizeEmail(current, 0) : current;
  const text = bodyText(bodyMarkdown, isLoading, demoMode);
  // The header goes above the body rather than in a metadata sidebar: the sidebar has a fixed narrow width
  // that cuts subjects and addresses off, while the body area uses the full width and wraps
  const markdown = `${emailHeaderMarkdown(displayEmail)}\n\n---\n\n${text}`;

  // Update the list too; an archived or deleted email has nothing left to show
  const emailContext: EmailContext = {
    ...context,
    onUpdate: (update) => {
      context.onUpdate(update);
      if ("removed" in update) pop();
      else setRead(update.read);
    },
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Email Actions">
            <RespondActions email={email} folder={context.folder} />
          </ActionPanel.Section>

          <ManageActions email={email} read={read} context={emailContext} />

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Email Body" content={text} />
            <Action.CopyToClipboard
              title="Copy Email Body as Markdown"
              content={emailAsMarkdown(displayEmail, text)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy Subject"
              content={displayEmail.subject}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Sender"
              content={formatAddresses(displayEmail.from)}
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

          {/* New actions go last so existing ones keep their positions */}
          {body?.html && (
            <ActionPanel.Section title="Original">
              <Action
                title="Open Original in Browser"
                icon={Icon.Window}
                onAction={() => openOriginalInBrowser(context.folder, email)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
