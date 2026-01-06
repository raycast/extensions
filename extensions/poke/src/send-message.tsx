import React, { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
  Icon,
  openExtensionPreferences,
  open,
} from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export default function SendMessage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  const sendMessage = async (text: string) => {
    const messageText = text.trim();

    if (!messageText) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Message cannot be empty",
      });
      return;
    }

    if (!preferences.apiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "API key not configured. Please set it in preferences.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "https://poke.com/api/v1/inbound-sms/webhook",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: messageText }),
        },
      );

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ message: "Unknown error" }))) as { message?: string };
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      await response.json();

      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Message sent to Poke!",
      });

      setMessage("");
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to send message",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessage = message.trim().length > 0;
  const hasApiKey = preferences.apiKey && preferences.apiKey.trim().length > 0;

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        hasApiKey
          ? "Type your message and press Enter to send to Poke..."
          : "Configure API key first (see instructions below)"
      }
      onSearchTextChange={setMessage}
      searchText={message}
      filtering={false}
    >
      {!hasApiKey ? (
        <>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
          <List.Item
            id="setup-instructions"
            icon={Icon.Info}
            title="Setup Required: API Key"
            subtitle="Get your API key from Poke settings"
            actions={
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components
              <ActionPanel>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
                <Action
                  icon={Icon.Gear}
                  title="Open Extension Preferences"
                  onAction={openExtensionPreferences}
                />
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
                <Action
                  icon={Icon.Globe}
                  title="Open Poke Settings"
                  onAction={() => open("https://poke.com/settings/advanced")}
                />
              </ActionPanel>
            }
          />
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
          <List.Item
            id="instructions"
            icon={Icon.BulletPoints}
            title="How to get your API key:"
            subtitle="1. Go to poke.com/settings/advanced"
          />
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
          <List.Item
            id="instructions-2"
            icon={Icon.Key}
            title="2. Copy your API key"
            subtitle="It will look like a long string of characters"
          />
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
          <List.Item
            id="instructions-3"
            icon={Icon.Gear}
            title="3. Open Extension Preferences"
            subtitle="Press Enter or Cmd+, to configure"
            actions={
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components
              <ActionPanel>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
                <Action
                  icon={Icon.Gear}
                  title="Open Extension Preferences"
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
          <List.Item
            id="instructions-4"
            icon={Icon.CheckCircle}
            title="4. Paste your API key and save"
            subtitle="Then come back here to send messages!"
          />
        </>
      ) : hasMessage ? (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components
        <List.Item
          id="send"
          title={message}
          subtitle="Press Enter to send"
          icon={Icon.Airplane}
          actions={
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components
            <ActionPanel>
              {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
              {/* @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components */}
              <Action
                icon={Icon.Airplane}
                title="Send Message"
                onAction={() => sendMessage(message)}
              />
            </ActionPanel>
          }
        />
      ) : (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - TypeScript 5.x strictness issue with Raycast React components
        <List.EmptyView
          icon={Icon.Message}
          title="Type a message to send to Poke"
          description="Your message will be sent when you press Enter"
        />
      )}
    </List>
  );
}
