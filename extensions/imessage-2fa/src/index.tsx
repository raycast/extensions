/**
 * Main extension component for 2FA code detection
 * Combines and displays 2FA codes from both iMessage and Email sources
 */

import { List, ActionPanel, Action, Icon, getPreferenceValues, closeMainWindow, Color } from "@raycast/api";
import useInterval from "@use-it/interval";
import { useState, useCallback, useEffect } from "react";
import { useMessages } from "./messages";
import { useEmails } from "./emails";
import { Message, SearchType, MessageSource, Preferences, VerificationLink } from "./types";
import { extractCode, formatDate, extractVerificationLink } from "./utils";
// import applescript from "applescript"; // Unused import
// import { promisify } from "util"; // Unused import
import { runAppleScript } from "@raycast/utils";
import React from "react";

// Interval for polling new messages (1 second)
const POLLING_INTERVAL = 1_000;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [searchType] = useState<SearchType>("code");
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [verificationLinks, setVerificationLinks] = useState<VerificationLink[]>([]);

  // Initialize message source based on user preferences
  const [messageSource, setMessageSource] = useState<MessageSource>(() => {
    return preferences.defaultSource || "all";
  });

  // Fetch messages from enabled sources (iMessage and/or Email)
  const {
    data: messageData,
    permissionView: messagePermissionView,
    revalidate: revalidateMessages,
  } = useMessages({
    searchText,
    searchType,
    enabled: preferences.enabledSources !== "email",
  });

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

  // Combine and sort messages based on selected source
  const data =
    messageSource === "imessage"
      ? preferences.enabledSources !== "email"
        ? messageData?.map((m) => ({ ...m, source: "imessage" as const, displayText: m.text })) || []
        : []
      : messageSource === "email"
      ? preferences.enabledSources !== "imessage"
        ? emailData?.map((m) => ({ ...m, source: "email" as const })) || []
        : []
      : [
          // When showing all sources, combine and sort by date
          ...(preferences.enabledSources !== "email"
            ? messageData?.map((m) => ({ ...m, source: "imessage" as const, displayText: m.text })) || []
            : []),
          ...(preferences.enabledSources !== "imessage"
            ? emailData?.map((m) => ({ ...m, source: "email" as const })) || []
            : []),
        ].sort((a, b) => new Date(b.message_date).getTime() - new Date(a.message_date).getTime());

  // Process verification links from messages - simplified to avoid update loops
  useEffect(() => {
    // Skip processing if no data to avoid unnecessary work or if verification links are disabled
    if (data.length === 0 || preferences.enableVerificationLinks === false) {
      // If verification links are disabled, clear any existing links
      if (verificationLinks.length > 0 && preferences.enableVerificationLinks === false) {
        setVerificationLinks([]);
      }
      return;
    }

    // Use a function for link processing to keep the effect body clean
    const processLinks = () => {
      const links: VerificationLink[] = [];

      data.forEach((message) => {
        const linkInfo = extractVerificationLink(message.text);
        if (linkInfo) {
          links.push({
            ...linkInfo,
            messageId: message.guid,
            source: message.source || "email",
            messageDate: message.message_date,
            sender: message.sender,
            displayText: message.displayText,
          });
        }
      });

      // Sort links by date (newest first)
      links.sort((a, b) => new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime());

      // Limit to the 10 most recent links
      return links.slice(0, 10);
    };

    // Process links and compare with current state before updating
    const newLinks = processLinks();

    // Only update state if links have actually changed
    // This deep comparison helps prevent unnecessary re-renders
    const linksChanged =
      newLinks.length !== verificationLinks.length ||
      newLinks.some(
        (link, i) => link.url !== verificationLinks[i]?.url || link.messageId !== verificationLinks[i]?.messageId
      );

    if (linksChanged) {
      setVerificationLinks(newLinks);
    }
  }, [data, preferences.enableVerificationLinks]); // Re-run when data or enableVerificationLinks changes

  // Auto-select the most recent item (either code or verification link)
  useEffect(() => {
    // Find the most recent message with a code
    let mostRecentWithCode = null;
    let mostRecentCodeTime = 0;

    if (data.length > 0) {
      // Filter out messages without displayText before checking for codes
      mostRecentWithCode = data
        .filter((message) => message.displayText)
        .find((message) => extractCode(message.displayText));
      if (mostRecentWithCode) {
        mostRecentCodeTime = new Date(mostRecentWithCode.message_date).getTime();
      }
    }

    // Find the most recent verification link (only if enabled)
    let mostRecentLink = null;
    let mostRecentLinkTime = 0;

    if (verificationLinks.length > 0 && preferences.enableVerificationLinks !== false) {
      // Links are already sorted by date (newest first)
      mostRecentLink = verificationLinks[0];
      mostRecentLinkTime = new Date(mostRecentLink.messageDate).getTime();
    }

    // Determine which is more recent and select it
    if (mostRecentWithCode && mostRecentLink) {
      // We have both a code and a link - compare timestamps
      if (mostRecentLinkTime >= mostRecentCodeTime) {
        // Link is more recent, select it
        const linkId = `link-${mostRecentLink.source}-${mostRecentLink.messageId}`;
        setSelectedItemId(linkId);
      } else {
        // Code is more recent, select it
        const codeId = `${mostRecentWithCode.source}-${mostRecentWithCode.guid}`;
        setSelectedItemId(codeId);
      }
    } else if (mostRecentLink) {
      // We only have a link, select it
      const linkId = `link-${mostRecentLink.source}-${mostRecentLink.messageId}`;
      setSelectedItemId(linkId);
    } else if (mostRecentWithCode) {
      // We only have a code, select it
      const codeId = `${mostRecentWithCode.source}-${mostRecentWithCode.guid}`;
      setSelectedItemId(codeId);
    }
    // If neither exists, don't select anything
  }, [data, verificationLinks, preferences.enableVerificationLinks]); // Run when data, links, or preference changes

  // Poll for new messages, waiting for initial email load to complete
  useInterval(() => {
    if (preferences.enabledSources !== "email") revalidateMessages();
    if (preferences.enabledSources !== "imessage" && isEmailLoadComplete) revalidateEmails();
  }, POLLING_INTERVAL);

  const handleSourceChange = useCallback((value: string) => {
    setMessageSource(value as MessageSource);
  }, []);

  // Show permission views if needed
  if (messagePermissionView && preferences.enabledSources !== "email") return messagePermissionView;
  if (emailPermissionView && preferences.enabledSources !== "imessage") return emailPermissionView;

  const showSourceDropdown = preferences.enabledSources === "both";

  // When rendering the UI, check if verification links are enabled
  const hasCodesOrLinks =
    data.filter((msg) => msg.displayText).some((msg) => extractCode(msg.displayText)) ||
    (verificationLinks.length > 0 && preferences.enableVerificationLinks !== false);

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
      {hasCodesOrLinks ? (
        <>
          {verificationLinks.length > 0 && preferences.enableVerificationLinks !== false && (
            <List.Section title="Verification Links">
              {verificationLinks.map((link) => (
                <LinkItem key={`link-${link.source}-${link.messageId}`} link={link} />
              ))}
            </List.Section>
          )}

          {data.filter((msg) => msg.displayText).some((msg) => extractCode(msg.displayText)) && (
            <List.Section title="Authentication Codes">
              {data
                .filter((msg) => msg.displayText)
                .map((message) => {
                  const code = extractCode(message.displayText);
                  if (!code) {
                    // Remove debug logging that was causing excessive console output
                    return null;
                  }

                  const itemId = `${message.source}-${message.guid}`;
                  return <MessageItem key={itemId} id={itemId} message={message} code={code} />;
                })}
            </List.Section>
          )}
        </>
      ) : (
        <List.EmptyView
          title={
            !isEmailLoadComplete && preferences.enabledSources !== "imessage"
              ? "Loading emails..."
              : "No codes or links found"
          }
          description={
            !isEmailLoadComplete && preferences.enabledSources !== "imessage"
              ? "Initial email load in progress"
              : "Keeps refreshing every second"
          }
          icon={!isEmailLoadComplete && preferences.enabledSources !== "imessage" ? Icon.Clock : Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

// Component for displaying verification links
const LinkItem = React.memo(({ link }: { link: VerificationLink }) => {
  // Different icons based on link type
  const icon =
    link.type === "verification"
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.Lock, tintColor: Color.Blue };

  // Extract hostname for display
  const hostname = new URL(link.url).hostname;
  const domain = hostname.replace(/^www\./, "");

  // Create a more descriptive title based on link type and domain
  const title = link.type === "verification" ? `Verify Email: ${domain}` : `Sign In: ${domain}`;

  return (
    <List.Item
      id={`link-${link.source}-${link.messageId}`}
      icon={icon}
      title={title}
      subtitle={new Date(link.messageDate).toLocaleTimeString()}
      accessories={[
        {
          text: link.source === "email" ? "Email" : "iMessage",
          icon: link.source === "email" ? Icon.Envelope : Icon.Message,
        },
      ]}
      detail={<LinkDetail link={link} />}
      actions={<LinkActions link={link} />}
    />
  );
});

function LinkDetail(props: { link: VerificationLink }) {
  return (
    <List.Item.Detail
      markdown={props.link.displayText}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={props.link.type === "verification" ? "Verification Link" : "Sign In Link"}
          />
          <List.Item.Detail.Metadata.Label title="URL" text={props.link.url} />
          <List.Item.Detail.Metadata.Label title="From" text={props.link.sender} />
          <List.Item.Detail.Metadata.Label title="Date" text={formatDate(new Date(props.link.messageDate))} />
          <List.Item.Detail.Metadata.Label title="Source" text={props.link.source === "email" ? "Email" : "iMessage"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function LinkActions(props: { link: VerificationLink }) {
  const actionTitle = props.link.type === "verification" ? "Verify Email" : "Sign In";

  return (
    <ActionPanel title="Action">
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title={`${actionTitle} in Default Browser`}
          url={props.link.url}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy Link"
          content={props.link.url}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Link and Message Details"
          content={`${props.link.url}\nFrom: ${props.link.sender}\nDate: ${formatDate(
            new Date(props.link.messageDate)
          )}\n\nMessage:\n${props.link.displayText}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// Separate component for list items to prevent unnecessary re-renders
const MessageItem = React.memo(
  ({
    message,
    code,
    id,
  }: {
    message: Message & { source: "email" | "imessage"; displayText: string };
    code: string;
    id: string;
  }) => {
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
);

function Detail(props: { message: Message; code: string }) {
  return (
    <List.Item.Detail
      markdown={props.message.displayText}
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
        <Action.Paste title="Paste Code" content={props.code} />
        <Action.CopyToClipboard title="Copy Code" content={props.code} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <TypeCode code={props.code} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={props.message.displayText}
          title="Copy Message"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          content={props.code + "\t" + props.message.displayText}
          title="Copy Code and Message"
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function TypeCode(props: { code: string }) {
  async function handleAction() {
    await closeMainWindow();
    await type(props.code);
  }

  return <Action title="Type Code" icon={Icon.Keyboard} onAction={handleAction} />;
}

async function type(text: string) {
  const script = `
    tell application "System Events"
      delay 0.3
      ${text
        .split("")
        .map(
          (char /*, i // Unused index */) => `
        delay 0.15
        keystroke "${char}"
      `
        )
        .join("")}
    end tell
  `;

  await runAppleScript(script);
}
