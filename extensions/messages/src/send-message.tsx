import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  LaunchProps,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";

import CreateMessagesQuicklink from "./components/CreateMessagesQuicklink";
import { getMessagesUrl, sendMessage } from "./helpers";
import { useChats } from "./hooks/useChats";

function createDeeplink(contactId: string, text: string) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const context = encodeURIComponent(JSON.stringify({ contactId, text }));
  return `${protocol}extensions/thomaslombart/messages/send-message?launchContext=${context}`;
}

type Values = {
  text: string;
  chat: string;
  closeMainWindow?: boolean;
};

type LaunchContext = {
  contactId: string;
  text: string;
};

export default function Command({
  draftValues,
  launchContext,
}: LaunchProps<{
  draftValues: Values;
  launchContext: LaunchContext;
}>) {
  const { shouldCloseMainWindow } = getPreferenceValues<Preferences.SendMessage>();
  const [searchText, setSearchText] = useState("");
  const { data: chats, isLoading, permissionView } = useChats(searchText);

  // There's no way to send a message to a group chat that doesn't have any names, so we filter them out.
  const filteredChats = chats?.filter((chat) => {
    if (chat.is_group) return !!chat.group_name;
    return true;
  });

  const { itemProps, handleSubmit, values, reset, focus } = useForm<Values>({
    async onSubmit(values) {
      const chat = filteredChats?.find((chat) => chat.guid === values.chat);

      if (!chat) {
        await showToast({ style: Toast.Style.Failure, title: "Could not find chat" });
        return;
      }

      const result = await sendMessage({
        address: chat.chat_identifier,
        text: values.text,
        service_name: chat.service_name,
        group_name: chat.group_name,
      });

      if (result === "Success") {
        if (shouldCloseMainWindow) {
          await closeMainWindow({ clearRootSearch: true });
        }

        await showToast({
          style: Toast.Style.Success,
          title: `Sent Message to ${chat.displayName}`,
          message: values.text,
          primaryAction: {
            title: `Open Chat in Messages`,
            onAction() {
              open(getMessagesUrl(chat));
            },
          },
        });

        reset({ text: "" });
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Could not send message", message: result });
      }
    },
    initialValues: {
      chat: draftValues?.chat ?? launchContext?.contactId ?? "",
      text: draftValues?.text ?? launchContext?.text ?? "",
    },
    validation: {
      chat: FormValidation.Required,
      text: FormValidation.Required,
    },
  });

  const chat = filteredChats?.find((chat) => chat.guid === values.chat);

  useEffect(() => {
    if (launchContext?.contactId) {
      focus("text");
    }
  }, [focus, launchContext?.contactId]);

  if (permissionView) {
    return permissionView;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SpeechBubble} title="Send Message" onSubmit={handleSubmit} />

          {chat ? (
            <ActionPanel.Section>
              <CreateMessagesQuicklink chat={chat} />
              <Action.CreateQuicklink
                title="Create Raycast Quicklink"
                quicklink={{
                  link: createDeeplink(values.chat, values.text),
                  name: `Send Message to ${chat?.displayName}`,
                }}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Dropdown
        {...itemProps.chat}
        title="Chat"
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        storeValue
        throttle
      >
        {filteredChats?.map((chat) => (
          <Form.Dropdown.Item
            key={chat.guid}
            title={chat.displayName}
            icon={chat.avatar}
            keywords={[chat.chat_identifier, ...(chat.group_participants?.split(",") ?? [])]}
            value={chat.guid}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea {...itemProps.text} title="Message" />
    </Form>
  );
}
