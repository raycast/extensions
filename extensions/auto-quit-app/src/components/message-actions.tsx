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
import React from "react";
import * as messageScripts from "../scripts/messages";
import { saveAllAttachments, saveAttachment } from "../scripts/attachments";
import { isJunkMailbox, isTrashMailbox } from "../utils/mailbox";
import { MailIcons, OutgoingMessageIcons } from "../utils/presets";
import { MessageProps, OutgoingMessageAction, Preferences } from "../types";
import { Attachments } from "./attachments";
import { ComposeMessage } from "./compose";
import { ViewMessage } from "./view-message";

const { primaryAction }: Preferences = getPreferenceValues();

type MessageActionsProps = MessageProps & { inMessageView?: boolean };

export const MessageActions = (props: MessageActionsProps): JSX.Element => {
  const { mailbox, account, message, inMessageView, onAction } = props;
  const navigation = useNavigation();

  const SeeInMail = () => (
    <Action
      title={"See in Mail"}
      icon={MailIcons.MailApp}
      onAction={async () => {
        try {
          await messageScripts.openMessage(message, mailbox);
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
      target={<ViewMessage {...props} />}
      onPush={() => {
        const action = async () => {
          if (!message.read) {
            await messageScripts.toggleMessageRead(message, mailbox, { silent: true });
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
        <React.Fragment>
          {primaryAction === "seeInMail" ? <SeeInMail /> : <SeeMessage />}
          {primaryAction === "seeInMail" ? <SeeMessage /> : <SeeInMail />}
        </React.Fragment>
      )}
      <ActionPanel.Section>
        <Action.Push
          title={OutgoingMessageAction.Reply}
          icon={OutgoingMessageIcons[OutgoingMessageAction.Reply]}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Reply} />}
        />

        <Action.Push
          title={OutgoingMessageAction.ReplyAll}
          icon={OutgoingMessageIcons[OutgoingMessageAction.ReplyAll]}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.ReplyAll} />}
        />

        <Action.Push
          title={OutgoingMessageAction.Forward}
          icon={OutgoingMessageIcons[OutgoingMessageAction.Forward]}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Forward} />}
        />

        <Action.Push
          title={OutgoingMessageAction.Redirect}
          icon={OutgoingMessageIcons[OutgoingMessageAction.Redirect]}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Redirect} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={message.read ? "Mark as Unread" : "Mark as Read"}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          icon={message.read ? MailIcons.Unread : Icon.CheckCircle}
          onAction={async () => {
            const action = async () => {
              await messageScripts.toggleMessageRead(message, mailbox);
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
          <React.Fragment>
            <Action.Push
              icon={Icon.Paperclip}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              title={`See ${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`}
              target={<Attachments {...props} />}
            />

            <Action
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={MailIcons.Save}
              title={`Save ${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`}
              onAction={async () => {
                if (message.numAttachments === 1) {
                  await saveAttachment(message, mailbox);
                } else {
                  await saveAllAttachments(message, mailbox);
                }
              }}
            />
          </React.Fragment>
        )}

        {!isJunkMailbox(mailbox) && (
          <Action
            title={"Move to Junk"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            icon={MailIcons.Junk}
            onAction={async () => {
              const action = async () => {
                await messageScripts.moveToJunk(message, account, mailbox);
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
            icon={MailIcons.Trash}
            onAction={async () => {
              const action = async () => {
                await messageScripts.moveToTrash(message, account, mailbox);
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
            icon={MailIcons.TrashRed}
            onAction={async () => {
              const confirm = await confirmAlert({
                title: "Delete message?",
                message: "This message will be permanently deleted.",
                icon: MailIcons.TrashRed,
              });

              if (confirm) {
                const action = async () => {
                  await messageScripts.deleteMessage(message, mailbox);
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
