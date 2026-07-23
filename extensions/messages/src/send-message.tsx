import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  Image,
  LaunchProps,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useMemo } from "react";

import CreateMessagesQuicklink from "./components/CreateMessagesQuicklink";
import HardReloadCache from "./components/HardReloadCache";
import { contactImageSource, getMessagesUrl, sendMessage } from "./helpers";
import { useMessageRecipients } from "./hooks/useMessageRecipients";
import { recipientTitle } from "./recipient-catalog";

function createDeeplink(contactId: string, text: string) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const context = encodeURIComponent(JSON.stringify({ contactId, text }));
  return `${protocol}extensions/thomaslombart/messages/send-message?launchContext=${context}`;
}

function contactIcon(imageData: string | null): Image.ImageLike {
  const source = contactImageSource(imageData);
  return source ? { source, mask: Image.Mask.Circle } : Icon.Person;
}

type Values = { text: string; chat: string; closeMainWindow?: boolean };
type LaunchContext = { contactId: string; text: string };

export default function Command({
  draftValues,
  launchContext,
}: LaunchProps<{ draftValues: Values; launchContext: LaunchContext }>) {
  const { shouldCloseMainWindow } = getPreferenceValues<{ shouldCloseMainWindow?: boolean }>();
  const { recents, contacts, isLoadingRecipients, isRecipientCatalogSettled, permissionView, hardReload } =
    useMessageRecipients();
  const recipientCatalog = useMemo(() => [...(recents ?? []), ...(contacts ?? [])], [contacts, recents]);
  const { itemProps, handleSubmit, values, reset, focus, setValue } = useForm<Values>({
    async onSubmit(values) {
      const recipient = recipientCatalog.find((candidate) => candidate.id === values.chat);
      if (!recipient) {
        await showToast({ style: Toast.Style.Failure, title: "Could not find chat" });
        return;
      }

      const result = await sendMessage({
        address: recipient.chat_identifier,
        text: values.text,
        service_name: recipient.service_name,
        group_name: recipient.group_name,
      });
      if (result !== "Success") {
        await showToast({ style: Toast.Style.Failure, title: "Could not send message", message: result });
        return;
      }

      if (shouldCloseMainWindow) await closeMainWindow({ clearRootSearch: true });
      await showToast({
        style: Toast.Style.Success,
        title: `Sent Message to ${recipient.displayName}`,
        message: values.text,
        primaryAction: {
          title: "Open Chat in Messages",
          async onAction() {
            await open(getMessagesUrl(recipient));
          },
        },
      });
      reset({ text: "" });
    },
    initialValues: {
      chat: draftValues?.chat ?? launchContext?.contactId ?? "",
      text: draftValues?.text ?? launchContext?.text ?? "",
    },
    validation: { chat: FormValidation.Required, text: FormValidation.Required },
  });
  const recipient = recipientCatalog.find((candidate) => candidate.id === values.chat);

  useEffect(() => {
    if (launchContext?.contactId) focus("text");
  }, [focus, launchContext?.contactId]);

  // Do not clear drafts until live chats and contacts have finished refreshing.
  useEffect(() => {
    if ((!recents && !contacts) || !isRecipientCatalogSettled || !values.chat) return;
    if (!recipientCatalog.some((candidate) => candidate.id === values.chat)) setValue("chat", "");
  }, [contacts, isRecipientCatalogSettled, recipientCatalog, recents, setValue, values.chat]);

  if (permissionView) return permissionView;
  return (
    <Form
      isLoading={isLoadingRecipients}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SpeechBubble} title="Send Message" onSubmit={handleSubmit} />
          {recipient ? (
            <ActionPanel.Section>
              <CreateMessagesQuicklink chat={recipient} />
              <Action.CreateQuicklink
                title="Create Raycast Quicklink"
                quicklink={{
                  link: createDeeplink(values.chat, values.text),
                  name: `Send Message to ${recipient.displayName}`,
                }}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <HardReloadCache onReload={hardReload} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Dropdown {...itemProps.chat} title="Chat" isLoading={isLoadingRecipients} storeValue>
        <Form.Dropdown.Section title="Recents">
          {(recents ?? []).map((candidate) => (
            <Form.Dropdown.Item
              key={candidate.id}
              title={recipientTitle(candidate)}
              icon={candidate.avatar}
              keywords={candidate.keywords}
              value={candidate.id}
            />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Contacts">
          {(contacts ?? []).map((candidate) => (
            <Form.Dropdown.Item
              key={candidate.id}
              title={recipientTitle(candidate)}
              icon={contactIcon(candidate.imageData)}
              keywords={candidate.keywords}
              value={candidate.id}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.TextArea {...itemProps.text} title="Message" />
    </Form>
  );
}
