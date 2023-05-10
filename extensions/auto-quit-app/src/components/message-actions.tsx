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
  const { mailbox, account, message, setMessage, deleteMessage, inMessageView } = props;
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
    <Action.Push title={"See Message"} icon={Icon.QuoteBlock} target={<ViewMessage {...props} />} />
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
            try {
              setMessage(account, { ...message, read: !message.read });
              await messageScripts.toggleMessageRead(message, mailbox);
              await showToast(Toast.Style.Success, `Message marked as ${message.read ? "unread" : "read"}`);
            } catch (error) {
              await showToast(Toast.Style.Failure, `Failed to mark message as ${message.read ? "unread" : "read"}`);
              console.error(error);
            }
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
              deleteMessage(account, message);
              await messageScripts.moveToJunk(message, account, mailbox);
              if (inMessageView) navigation.pop();
            }}
          />
        )}
        {!isTrashMailbox(mailbox) ? (
          <Action
            title={"Move to Trash"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            icon={MailIcons.Trash}
            onAction={async () => {
              deleteMessage(account, message);
              await messageScripts.moveToTrash(message, account, mailbox);
              if (inMessageView) navigation.pop();
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
                deleteMessage(account, message);
                await messageScripts.deleteMessage(message, mailbox);
                if (inMessageView) navigation.pop();
              }
            }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
};
