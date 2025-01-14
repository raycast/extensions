/**
 * Main extension component for 2FA code detection
 * Combines and displays 2FA codes from both iMessage and Email sources
 */

import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import useInterval from "@use-it/interval";
import { useState, useCallback, useEffect } from "react";
import { useMessages } from "./messages";
import { useEmails } from "./emails";
import { Message, SearchType, MessageSource, Preferences } from "./types";
import { extractCode, formatDate } from "./utils";

// Interval for polling new messages (1 second)
const POLLING_INTERVAL = 1_000;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [searchType] = useState<SearchType>("code");
  const [selectedItemId, setSelectedItemId] = useState<string>();

  // Initialize message source based on user preferences
  const [messageSource, setMessageSource] = useState<MessageSource>(() => {
    return preferences.defaultSource || "all";
  });

  // Fetch iMessage data if enabled
  const {
    data: messageData,
    permissionView: messagePermissionView,
    revalidate: revalidateMessages,
  } = useMessages({
    searchText,
    searchType,
    enabled: preferences.enabledSources !== "email",
  });

  // Fetch email data if enabled
  const {
    data: emailData,
    permissionView: emailPermissionView,
    revalidate: revalidateEmails,
    isInitialLoadComplete: isEmailLoadComplete,
  } = useEmails({
    searchText,
    searchType,
    enabled: preferences.enabledSources !== "imessage",
  });

  // Combine and sort messages based on selected source and preferences
  const data =
    messageSource === "imessage"
      ? preferences.enabledSources !== "email"
        ? messageData?.map((m) => ({ ...m, source: "imessage" as const })) || []
        : []
      : messageSource === "email"
      ? preferences.enabledSources !== "imessage"
        ? emailData?.map((m) => ({ ...m, source: "email" as const })) || []
        : []
      : [
          ...(preferences.enabledSources !== "email"
            ? messageData?.map((m) => ({ ...m, source: "imessage" as const })) || []
            : []),
          ...(preferences.enabledSources !== "imessage"
            ? emailData?.map((m) => ({ ...m, source: "email" as const })) || []
            : []),
        ].sort((a, b) => new Date(b.message_date).getTime() - new Date(a.message_date).getTime());

  // Update selected item whenever data changes
  useEffect(() => {
    if (data.length > 0) {
      // Find the most recent item that has a valid code
      const mostRecentWithCode = data.find((message) => extractCode(message.text));
      if (mostRecentWithCode) {
        const newSelectedId = `${mostRecentWithCode.source}-${mostRecentWithCode.guid}`;
        setSelectedItemId(newSelectedId);
      }
    }
  }, [messageData, emailData]);

  // Only start polling after initial email load is complete
  useInterval(() => {
    if (preferences.enabledSources !== "email") revalidateMessages();
    if (preferences.enabledSources !== "imessage" && isEmailLoadComplete) revalidateEmails();
  }, POLLING_INTERVAL);

  const handleSourceChange = useCallback((value: string) => {
    setMessageSource(value as MessageSource);
  }, []);

  if (messagePermissionView && preferences.enabledSources !== "email") return messagePermissionView;
  if (emailPermissionView && preferences.enabledSources !== "imessage") return emailPermissionView;

  const showSourceDropdown = preferences.enabledSources === "both";

  return (
    <List
      searchText={searchText}
      selectedItemId={selectedItemId}
      searchBarAccessory={
        showSourceDropdown ? (
          <List.Dropdown tooltip="Filter by source" storeValue onChange={handleSourceChange}>
            <List.Dropdown.Item title="All Sources" value="all" />
            <List.Dropdown.Item title="iMessage" value="imessage" />
            <List.Dropdown.Item title="Email" value="email" />
          </List.Dropdown>
        ) : null
      }
      isShowingDetail
      onSearchTextChange={setSearchText}
    >
      {data.length > 0 ? (
        data.map((message) => {
          const code = extractCode(message.text);
          if (!code) {
            if (process.env.NODE_ENV === "development") {
              console.debug("no code found in message");
            }
            return null;
          }

          const itemId = `${message.source}-${message.guid}`;
          return <MessageItem key={itemId} id={itemId} message={message} code={code} />;
        })
      ) : (
        <List.EmptyView
          title={
            !isEmailLoadComplete && preferences.enabledSources !== "imessage" ? "Loading emails..." : "No codes found"
          }
          description={
            !isEmailLoadComplete && preferences.enabledSources !== "imessage"
              ? "Initial email load in progress"
              : "Keeps refreshing every second"
          }
        />
      )}
    </List>
  );
}

// Separate component for list items to prevent unnecessary re-renders
function MessageItem({
  message,
  code,
  id,
}: {
  message: Message & { source: "email" | "imessage" };
  code: string;
  id: string;
}) {
  return (
    <List.Item
      id={id}
      icon={message.source === "email" ? Icon.Envelope : Icon.Message}
      title={code}
      detail={<Detail message={message} code={code} />}
      actions={<Actions message={message} code={code} />}
    />
  );
}

function Detail(props: { message: Message; code: string }) {
  return (
    <List.Item.Detail
      markdown={props.message.text}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Code" text={props.code} />
          <List.Item.Detail.Metadata.Label title="From" text={props.message.sender} />
          <List.Item.Detail.Metadata.Label title="Date" text={formatDate(new Date(props.message.message_date))} />
          <List.Item.Detail.Metadata.Label
            title="Source"
            text={props.message.source === "email" ? "Email" : "iMessage"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function Actions(props: { message: Message; code: string }) {
  return (
    <ActionPanel title="Action">
      <ActionPanel.Section>
        <Action.Paste content={props.code} title="Paste Code" />
        <Action.CopyToClipboard content={props.code} title="Copy Code" />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={props.message.text}
          title="Copy Message"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          content={props.code + "\t" + props.message.text}
          title="Copy Code and Message"
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
