import {
  Action,
  ActionPanel,
  Icon,
  Toast,
  showToast,
  confirmAlert,
  useNavigation,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";

import { AttachmentList } from "./attachment-list";
import { ComposeMessage } from "./compose-message";
import { MessageDetail } from "./message-detail";
import { MessageProps, OutgoingMessageAction } from "../types";
import {
  openMessage,
  toggleMessageRead,
  moveMessageToJunk,
  moveMessageToTrash,
  deleteMessage,
  moveMessageToArchive,
} from "../scripts/messages";
import { saveAllAttachments, saveAttachment } from "../scripts/attachments";
import { isArchiveMailbox, isJunkMailbox, isTrashMailbox } from "../utils/mailbox";
import { MailIcon, OutgoingMessageIcon } from "../utils/presets";

const { primaryAction } = getPreferenceValues<Preferences>();

export type MessageActionsProps = MessageProps & { inMessageView?: boolean };

export const MessageActions = (props: MessageActionsProps) => {
  const { mailbox, account, message, inMessageView, onAction } = props;

  const navigation = useNavigation();

  const SeeInMail = () => (
    <Action
      title={"See in Mail"}
      icon={MailIcon.MailApp}
      onAction={async () => {
        try {
          await openMessage(message, mailbox);
          await closeMainWindow();
        } catch (error) {
          await showToast(Toast.Style.Failure, "Failed to open in Mail");
          console.error(error);
        }
      }}
    />
  );

  const SeeMessage = () => (
    <Action.Push
      title={"See Message"}
      icon={Icon.QuoteBlock}
      target={<MessageDetail {...props} />}
      onPush={() => {
        const action = async () => {
          if (!message.read) {
            await toggleMessageRead(message, mailbox, { silent: true });
          }
        };

        const actionPayload = {
          account,
          message: { ...message, read: true },
        };

        const invokeAction = onAction ? () => onAction(action, actionPayload) : action;

        invokeAction();
      }}
    />
  );

  return (
    <ActionPanel>
      {inMessageView ? (
        <SeeInMail />
      ) : (
        <>
          {primaryAction === "openMessage" ? <SeeInMail /> : <SeeMessage />}
          {primaryAction === "openMessage" ? <SeeMessage /> : <SeeInMail />}
        </>
      )}
      <ActionPanel.Section>
        <Action.Push
          title={OutgoingMessageAction.Reply}
          icon={OutgoingMessageIcon[OutgoingMessageAction.Reply]}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Reply} />}
        />

        <Action.Push
          title={OutgoingMessageAction.ReplyAll}
          icon={OutgoingMessageIcon[OutgoingMessageAction.ReplyAll]}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.ReplyAll} />}
        />

        <Action.Push
          title={OutgoingMessageAction.Forward}
          icon={OutgoingMessageIcon[OutgoingMessageAction.Forward]}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Forward} />}
        />

        <Action.Push
          title={OutgoingMessageAction.Redirect}
          icon={OutgoingMessageIcon[OutgoingMessageAction.Redirect]}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Redirect} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={message.read ? "Mark as Unread" : "Mark as Read"}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          icon={message.read ? MailIcon.Unread : Icon.CheckCircle}
          onAction={async () => {
            const action = async () => {
              await toggleMessageRead(message, mailbox);
            };

            const actionPayload = {
              account,
              message: { ...message, read: !message.read },
            };

            const invokeAction = onAction ? () => onAction(action, actionPayload) : action;

            invokeAction();
          }}
        />

        {message.numAttachments > 0 && (
          <>
            <Action.Push
              icon={Icon.Paperclip}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              title={`See ${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`}
              target={<AttachmentList {...props} />}
            />

            <Action
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={MailIcon.Save}
              title={`Save ${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`}
              onAction={async () => {
                if (message.numAttachments === 1) {
                  await saveAttachment(message, mailbox);
                } else {
                  await saveAllAttachments(message, mailbox);
                }
              }}
            />
          </>
        )}

        {!isArchiveMailbox(mailbox) && (
          <Action
            title={"Move to Archive"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            icon={MailIcon.Archive}
            onAction={async () => {
              const action = async () => {
                await moveMessageToArchive(message, account, mailbox);
                if (inMessageView) navigation.pop();
              };

              const actionPayload = { account, message };
              const invokeAction = onAction ? () => onAction(action, actionPayload) : action;

              invokeAction();
            }}
          />
        )}

        {!isJunkMailbox(mailbox) && (
          <Action
            title={"Move to Junk"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            icon={MailIcon.Junk}
            onAction={async () => {
              const action = async () => {
                await moveMessageToJunk(message, account, mailbox);
                if (inMessageView) navigation.pop();
              };

              const actionPayload = { account, message };
              const invokeAction = onAction ? () => onAction(action, actionPayload) : action;

              invokeAction();
            }}
          />
        )}

        {!isTrashMailbox(mailbox) ? (
          <Action
            title={"Move to Trash"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            icon={MailIcon.Trash}
            onAction={async () => {
              const action = async () => {
                await moveMessageToTrash(message, account, mailbox);
                if (inMessageView) navigation.pop();
              };

              const actionPayload = { account, message };
              const invokeAction = onAction ? () => onAction(action, actionPayload) : action;

              invokeAction();
            }}
          />
        ) : (
          <Action
            title={"Delete Message"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            icon={MailIcon.TrashRed}
            onAction={async () => {
              const confirm = await confirmAlert({
                title: "Delete message?",
                message: "This message will be permanently deleted.",
                icon: MailIcon.TrashRed,
              });

              if (confirm) {
                const action = async () => {
                  await deleteMessage(message, mailbox);
                  if (inMessageView) navigation.pop();
                };

                const actionPayload = { account, message };
                const invokeAction = onAction ? () => onAction(action, actionPayload) : action;

                invokeAction();
              }
            }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
};
