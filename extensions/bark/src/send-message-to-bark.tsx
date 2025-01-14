import { Action, ActionPanel, Cache, Form, Icon } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getIcon, getSelectedMessage, getSound, sendMessage } from "./utils/common-utils";
import { CacheKey, sounds } from "./utils/constants";
import { autoCloseWindow, autoGetMessage } from "./types/preferences";
import { ActionOpenPreferences } from "./component/action-open-preferences";

export default function SendMessageToBark() {
  const [message, setMessage] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [subTitle, setSubTitle] = useState<string>("");
  const [sound, setSound] = useState<string>(getSound());
  const [icon, setIcon] = useState<string>(getIcon());
  const [badge, setBadge] = useState<number>(0);

  // message is required
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function _fetchItemInput() {
      if (autoGetMessage) {
        const selectedMessage_ = await getSelectedMessage();
        setMessage(selectedMessage_);
      }
    }

    _fetchItemInput().then();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Send"
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                if (message.length === 0) {
                  setError("Message is required");
                  return;
                }
                await sendMessage(message, title, subTitle, badge, autoCloseWindow);
                setMessage("");
                setTitle("");
                setSubTitle("");
                setBadge(0);
              }}
            />
          </ActionPanel.Section>
          <ActionOpenPreferences command={true} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"message"}
        title={"Message"}
        placeholder={"Message"}
        value={message}
        error={error}
        onChange={(newValue) => {
          if (newValue.length > 0) {
            setError("");
          }
          setMessage(newValue);
        }}
      />
      <Form.Separator />
      <Form.Description text={"The following content is optional"} />
      <Form.TextField
        id={"title"}
        title={"Title"}
        placeholder={"Title"}
        value={title}
        onChange={(newValue) => {
          setTitle(newValue);
        }}
      />
      <Form.TextField
        id={"subTitle"}
        title={"SubTitle"}
        placeholder={"SubTitle"}
        value={subTitle}
        onChange={(newValue) => {
          setSubTitle(newValue);
        }}
      />
      <Form.TextField
        id={"badge"}
        title={"Badge"}
        placeholder={"0"}
        value={badge.toString()}
        onChange={(newValue) => {
          const number = parseInt(newValue);
          if (isNaN(number)) {
            setBadge(0);
          } else {
            setBadge(number);
          }
        }}
      />
      <Form.TextField
        id={"icon"}
        title={"Icon"}
        placeholder={"Icon URL"}
        value={icon}
        onChange={(newValue) => {
          const cache = new Cache();
          cache.set(CacheKey.ICON, newValue);
          setIcon(newValue);
        }}
      />
      <Form.Dropdown
        id={"sound"}
        title={"Sound"}
        value={sound}
        onChange={async (newValue) => {
          const cache = new Cache();
          cache.set(CacheKey.SOUND, newValue);
          setSound(newValue);
        }}
      >
        {sounds.map((messageSound) => {
          return (
            <Form.Dropdown.Item
              icon={messageSound.icon}
              key={messageSound.name}
              title={messageSound.name}
              value={messageSound.value}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
