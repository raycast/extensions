import { Action, ActionPanel, Color, Icon, List, environment, showToast, Toast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useBlipState } from "../hooks/useBlipState";
import { abandonSearch, startSearch } from "../lib/actions";
import { contentTitle, type SendContent } from "../lib/content";
import { deviceKindLabel, listRecipients, searchResults, type Recipient } from "../lib/model";
import { cleanOutbox } from "../lib/outbox";
import { getQuickSendRecipient, setQuickSendRecipient } from "../lib/quick-send";
import { sendToRecipient } from "../lib/send";
import { primaryShortcut } from "../lib/shortcuts";
import { SearchStatus, DeviceKind } from "../lib/types";
import { BlipErrorView } from "./BlipErrorView";

export interface RecipientListProps {
  /** What will be sent. Undefined while it is still being read. */
  content?: SendContent;
  /** Extra actions after "Send … to <recipient>", which is always the Enter action. */
  extraActions?: (recipient: Recipient) => ReactNode;
  isLoading?: boolean;
  /** First Quick Send: the recipient picked here is remembered for Quick Send. */
  rememberForQuickSend?: boolean;
  /** Pushed from another screen. Root commands keep Raycast's default title. */
  isNested?: boolean;
}

function recipientIcon(recipient: Recipient) {
  if (recipient.kind === "person") return Icon.Person;
  switch (recipient.deviceKind) {
    case DeviceKind.Phone:
      return Icon.Mobile;
    case DeviceKind.Tablet:
      return Icon.Mobile;
    case DeviceKind.Laptop:
      return Icon.Monitor;
    default:
      return Icon.Desktop;
  }
}

function onlineAccessory(recipient: Recipient): List.Item.Accessory {
  return recipient.isOnline
    ? { tag: { value: "Online", color: Color.Green } }
    : { tag: { value: "Offline", color: Color.SecondaryText } };
}

function matches(recipient: Recipient, query: string) {
  const q = query.toLowerCase();
  return recipient.name.toLowerCase().includes(q) || recipient.subtitle.toLowerCase().includes(q);
}

/** Debounced server search for Blip users by name or email. */
function useUserSearch(query: string) {
  const [searchId, setSearchId] = useState<string>();
  const current = useRef<string | undefined>(undefined);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSearchId(undefined);
      return;
    }
    const timer = setTimeout(() => {
      const id = randomUUID().toUpperCase();
      const previous = current.current;
      current.current = id;
      setSearchId(id);
      startSearch(id, trimmed).catch(() => {});
      if (previous) abandonSearch(previous).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(
    () => () => {
      if (current.current) abandonSearch(current.current).catch(() => {});
    },
    [],
  );
  return searchId;
}

export function RecipientList({
  content,
  extraActions,
  isLoading,
  rememberForQuickSend,
  isNested,
}: RecipientListProps) {
  const { state, error, isLoading: stateLoading } = useBlipState();
  const [query, setQuery] = useState("");
  const searchId = useUserSearch(query);
  const [quickSendKey, setQuickSendKey] = useState<string>();

  useEffect(() => {
    getQuickSendRecipient().then((recipient) => setQuickSendKey(recipient?.key));
  }, []);

  async function toggleQuickSend(recipient: Recipient) {
    const isCurrent = quickSendKey === recipient.key;
    await setQuickSendRecipient(isCurrent ? undefined : recipient);
    setQuickSendKey(isCurrent ? undefined : recipient.key);
    await showToast({
      style: Toast.Style.Success,
      title: isCurrent ? "Quick Send recipient cleared" : `Quick Send now goes to ${recipient.name}`,
    });
  }

  useEffect(() => {
    if (state) cleanOutbox(environment.supportPath, state);
  }, [Boolean(state)]);

  const recipients = useMemo(() => (state ? listRecipients(state) : []), [state]);
  const visible = query ? recipients.filter((r) => matches(r, query)) : recipients;
  const known = new Set(recipients.map((r) => r.key));
  const found = state && searchId ? searchResults(state, searchId).filter((r) => !known.has(r.key)) : [];
  const searching = Boolean(searchId && state?.searches?.[searchId]?.fetch_status === SearchStatus.InProgress);

  if (error && !state) return <BlipErrorView error={error} />;

  const what = content ? contentTitle(content) : undefined;
  const ownDevices = visible.filter((r) => r.kind === "own-device");
  const people = visible.filter((r) => r.kind === "person");

  const renderItem = (recipient: Recipient) => (
    <List.Item
      key={recipient.key}
      icon={recipientIcon(recipient)}
      title={recipient.name}
      subtitle={recipient.kind === "own-device" ? deviceKindLabel(recipient.deviceKind) : recipient.subtitle}
      accessories={[
        ...(quickSendKey === recipient.key ? [{ icon: Icon.Bolt, tooltip: "Quick Send recipient" }] : []),
        onlineAccessory(recipient),
      ]}
      keywords={[recipient.subtitle]}
      actions={
        content && (
          <ActionPanel title={`Send ${what}`}>
            <Action
              title={`Send ${what} to ${recipient.name}`}
              icon={Icon.Upload}
              onAction={async () => {
                if (!rememberForQuickSend) return sendToRecipient(recipient, content);
                await setQuickSendRecipient(recipient);
                await sendToRecipient(recipient, content, { note: "Quick Send will use them from now on" });
              }}
            />
            {extraActions?.(recipient)}
            <Action
              title={quickSendKey === recipient.key ? "Stop Using for Quick Send" : "Use for Quick Send"}
              icon={Icon.Bolt}
              shortcut={primaryShortcut("d", true)}
              onAction={() => toggleQuickSend(recipient)}
            />
          </ActionPanel>
        )
      }
    />
  );

  return (
    <List
      navigationTitle={isNested && what ? `Send ${what}` : undefined}
      isLoading={isLoading || !content || stateLoading || searching}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={
        !what
          ? "Loading…"
          : rememberForQuickSend
            ? `Send ${what} to… (remembered for Quick Send)`
            : `Send ${what} to… (search devices, contacts or anyone on Blip)`
      }
    >
      <List.Section title="Your Devices">{ownDevices.map(renderItem)}</List.Section>
      <List.Section title="Contacts">{people.map(renderItem)}</List.Section>
      {found.length > 0 && <List.Section title="People on Blip">{found.map(renderItem)}</List.Section>}
      {!stateLoading && visible.length === 0 && found.length === 0 && (
        <List.EmptyView
          icon={Icon.Person}
          title={query ? "No matches" : "No devices or contacts yet"}
          description={
            query
              ? "Type a full name or email to search Blip."
              : "Sign in to Blip on another device, or add a contact in Blip."
          }
        />
      )}
      {error && state && (
        <List.Section title="Connection">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="Lost connection to Blip"
            subtitle={error.message}
          />
        </List.Section>
      )}
    </List>
  );
}
