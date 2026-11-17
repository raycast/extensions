import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlipState } from "../hooks/useBlipState";
import { abandonSearch, newId, startSearch } from "../lib/actions";
import { contentScreenTitle, contentTitle, type SendContent } from "../lib/content";
import { deviceKindLabel, listRecipients, recipientKey, searchResults, type Recipient } from "../lib/model";
import { QUICK_SEND_KEY, refreshQuickSendSubtitles, type QuickSendRecipient } from "../lib/quick-send";
import { sendToRecipient } from "../lib/send";
import { fileManagerName } from "../lib/selection";
import { primaryShortcut } from "../lib/shortcuts";
import { DeviceKind, SearchStatus } from "../lib/types";
import { BlipErrorView } from "./BlipErrorView";
import { OpenBlipAction } from "./OpenBlipAction";
import { TextForm } from "./SendForms";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

export interface RecipientListProps {
  /** What will be sent. While undefined (still being read), the list waits and Blip isn't contacted yet. */
  content?: SendContent;
  /** First Quick Send: the recipient picked here is remembered for Quick Send. */
  rememberForQuickSend?: boolean;
  /** Pushed from another screen. Root commands keep Raycast's default title. */
  isNested?: boolean;
}

function recipientIcon(recipient: Recipient) {
  if (recipient.kind === "person") return Icon.Person;
  switch (recipient.deviceKind) {
    case DeviceKind.Phone:
    case DeviceKind.Tablet:
      return Icon.Mobile;
    case DeviceKind.Laptop:
      return Icon.Monitor;
    default:
      return Icon.Desktop;
  }
}

function recipientSubtitle(recipient: Recipient) {
  return recipient.kind === "own-device" ? deviceKindLabel(recipient.deviceKind) : recipient.subtitle;
}

function onlineAccessory(recipient: Recipient): List.Item.Accessory {
  return recipient.isOnline
    ? { icon: { source: Icon.CircleFilled, tintColor: Color.Green }, tooltip: "Online" }
    : { icon: { source: Icon.Circle, tintColor: Color.SecondaryText }, tooltip: "Offline" };
}

function matches(recipient: Recipient, query: string) {
  const q = query.toLowerCase();
  return [recipient.name, recipient.subtitle, recipientSubtitle(recipient)].some((text) =>
    text.toLowerCase().includes(q),
  );
}

/** Debounced server search for Blip users by name or email. `isPending` covers the debounce too. */
function useUserSearch(query: string) {
  const [searchId, setSearchId] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  const current = useRef<string | undefined>(undefined);

  const abandonCurrent = () => {
    if (current.current) abandonSearch(current.current).catch(() => {});
    current.current = undefined;
  };

  useEffect(() => {
    if (query.length < MIN_SEARCH_LENGTH) {
      abandonCurrent();
      setSearchId(undefined);
      setIsPending(false);
      return;
    }
    setIsPending(true);
    const timer = setTimeout(() => {
      abandonCurrent();
      const id = newId();
      current.current = id;
      setSearchId(id);
      setIsPending(false);
      startSearch(id, query).catch((error) => {
        if (current.current !== id) return; // A newer search has replaced this one.
        setSearchId(undefined);
        showFailureToast(error, { title: "Couldn't Search Blip" });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => abandonCurrent, []);
  return { searchId, isPending };
}

export function RecipientList({ content, rememberForQuickSend, isNested }: RecipientListProps) {
  const { push, pop } = useNavigation();
  const { state, error, isLoading: stateLoading } = useBlipState({ execute: Boolean(content) });
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const { searchId, isPending } = useUserSearch(query);
  const quickSend = useLocalStorage<QuickSendRecipient>(QUICK_SEND_KEY);

  const recipients = useMemo(() => (state ? listRecipients(state) : []), [state]);
  const visible = query ? recipients.filter((r) => matches(r, query)) : recipients;
  const known = new Set(recipients.map((r) => r.key));
  const found = state && searchId ? searchResults(state, searchId).filter((r) => !known.has(r.key)) : [];
  const search = searchId ? state?.searches?.[searchId] : undefined;
  // Until Blip has the search in its state, it's still running.
  const searching = isPending || Boolean(searchId && (!search || search.fetch_status === SearchStatus.InProgress));

  if (error && !state) return <BlipErrorView error={error} />;

  const what = content ? contentTitle(content) : undefined;
  const quickSendKey = quickSend.value ? recipientKey(quickSend.value.peerId) : undefined;
  const remember = async (recipient: Recipient) => {
    await quickSend.setValue({ peerId: recipient.peerId, name: recipient.name });
    refreshQuickSendSubtitles();
  };

  async function send(recipient: Recipient, item: SendContent, keepOpen = false) {
    if (!rememberForQuickSend) return sendToRecipient(recipient, item, { keepOpen });
    // Remember the recipient only once the send went through, and before Raycast closes.
    return sendToRecipient(recipient, item, {
      note: "now your Quick Send recipient",
      onSent: () => remember(recipient),
    });
  }

  async function toggleQuickSend(recipient: Recipient) {
    const isCurrent = quickSendKey === recipient.key;
    if (isCurrent) {
      await quickSend.removeValue();
      refreshQuickSendSubtitles();
    } else await remember(recipient);
    await showToast({
      style: Toast.Style.Success,
      title: isCurrent ? "Quick Send Recipient Cleared" : `Quick Send Now Goes to ${recipient.name}`,
    });
  }

  const renderItem = (recipient: Recipient) => (
    <List.Item
      key={recipient.key}
      icon={recipientIcon(recipient)}
      title={recipient.name}
      subtitle={recipientSubtitle(recipient)}
      accessories={[
        ...(quickSendKey === recipient.key ? [{ icon: Icon.Bolt, tooltip: "Quick Send recipient" }] : []),
        onlineAccessory(recipient),
      ]}
      actions={
        content && (
          <ActionPanel title={rememberForQuickSend ? "Set Up Quick Send" : `Send ${what}`}>
            <Action title={`Send to ${recipient.name}`} icon={Icon.Upload} onAction={() => send(recipient, content)} />
            {content.kind === "text" && !content.concealed && (
              <Action
                title="Edit Text Before Sending…"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() =>
                  push(
                    <TextForm
                      navigationTitle="Edit Text"
                      submitTitle={`Send to ${recipient.name}`}
                      submitIcon={Icon.Upload}
                      initialText={content.text}
                      onSubmit={async (text) => {
                        if (await send(recipient, { ...content, text })) pop();
                      }}
                    />,
                  )
                }
              />
            )}
            {content.kind === "files" && (
              <Action.ShowInFinder title={`Show in ${fileManagerName}`} path={content.paths[0]} />
            )}
            {content.kind === "image" && (
              <Action.Open title="Open Image" icon={{ fileIcon: content.path }} target={content.path} />
            )}
            {!rememberForQuickSend && (
              <ActionPanel.Section>
                <Action
                  title={quickSendKey === recipient.key ? "Stop Using for Quick Send" : "Use for Quick Send"}
                  icon={Icon.Bolt}
                  shortcut={primaryShortcut("d", true)}
                  onAction={() => toggleQuickSend(recipient)}
                />
                <Action
                  title="Send and Choose Another"
                  icon={Icon.Repeat}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "return" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "return" },
                  }}
                  onAction={() => send(recipient, content, true)}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        )
      }
    />
  );

  const ownDevices = visible.filter((r) => r.kind === "own-device");
  const people = visible.filter((r) => r.kind === "person");
  const isSearchingPeople = query.length >= MIN_SEARCH_LENGTH && searching;

  return (
    <List
      navigationTitle={isNested && content ? contentScreenTitle(content) : undefined}
      isLoading={!content || stateLoading || searching}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        rememberForQuickSend ? "Choose your Quick Send recipient" : what ? `Send ${what} to…` : "Search recipients"
      }
    >
      <List.Section title="Your Devices">{ownDevices.map(renderItem)}</List.Section>
      <List.Section title="Contacts">{people.map(renderItem)}</List.Section>
      {found.length > 0 && <List.Section title="People on Blip">{found.map(renderItem)}</List.Section>}
      {state && !isSearchingPeople && visible.length === 0 && found.length === 0 && (
        <List.EmptyView
          icon={Icon.Person}
          title={query ? "No Matches" : "No Devices or Contacts Yet"}
          description={
            query
              ? query.length < MIN_SEARCH_LENGTH
                ? "Keep typing a name or email to search everyone on Blip."
                : "No one on Blip matches that name or email."
              : "Type a name or email to find anyone on Blip, or sign in to Blip on another device."
          }
          actions={
            !query && (
              <ActionPanel>
                <OpenBlipAction />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}
