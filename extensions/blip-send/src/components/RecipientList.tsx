import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { dispatch } from "../blip/client";
import type { BlipState } from "../blip/client";
import { relativeTime } from "../blip/format";
import { contacts, isSignedIn, myDevices, sendFiles, summarizeFiles, toPerson } from "../blip/model";
import type { PersonRecipient, Recipient } from "../blip/model";
import { useBlipState } from "../hooks/useBlipState";
import { fileManager, fileManagerIcon } from "../platform";
import { Shortcuts } from "../shortcuts";
import { BlipUnavailable, NotSignedIn } from "./BlipUnavailable";
import { deviceIcon, personIcon, presenceAccessory } from "./icons";
import { TransfersList } from "./TransfersList";

interface Props {
  files: string[];
  /** Lets the caller swap the files (for example, open the file picker again). */
  onChangeFiles?: () => void;
}

interface Preferences {
  afterSend: "close" | "progress";
}

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

/**
 * The recipient picker: your devices first, then contacts, then people on Blip that match the search.
 */
export function RecipientList({ files, onChangeFiles }: Props) {
  const { state, isLoading, unavailable, refresh } = useBlipState();
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [sending, setSending] = useState(false);
  const summary = useMemo(() => summarizeFiles(files), [files]);
  const searchId = useServerSearch(searchText, state);

  if (unavailable && !state) return <BlipUnavailable onReady={refresh} navigationTitle="Send with Blip" />;
  if (state && !isSignedIn(state)) return <NotSignedIn />;

  const devices = state ? myDevices(state) : [];
  const people = state ? contacts(state) : [];
  const query = searchText.trim().toLowerCase();
  const visibleDevices = devices.filter((d) => matches(query, d.title));
  const visiblePeople = people.filter((p) => matches(query, p.title, p.email));
  const shownIds = new Set([...visiblePeople.map((p) => p.id)]);
  const found = state ? serverResults(state, searchId).filter((p) => !shownIds.has(p.id)) : [];

  async function send(recipient: Recipient) {
    if (sending) return;
    setSending(true);
    const preferences = getPreferenceValues<Preferences>();
    const toast = await showToast({ style: Toast.Style.Animated, title: `Sending to ${recipient.title}…` });
    try {
      const transferId = await sendFiles(files, recipient.peer);
      if (preferences.afterSend === "progress") {
        await toast.hide();
        push(<TransfersList focusId={transferId} navigationTitle={`Sending to ${recipient.title}`} />);
      } else {
        const verb = recipient.kind === "device" && !recipient.online ? "Queued" : "Sending";
        await showHUD(`${verb} ${summary.label} to ${recipient.title}`, {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not start the transfer" });
    } finally {
      setSending(false);
    }
  }

  const noMatches = query.length > 0 && visibleDevices.length + visiblePeople.length + found.length === 0;

  return (
    <List
      isLoading={isLoading || sending}
      navigationTitle={`Send ${summary.label}`}
      searchBarPlaceholder="Send to a device, a contact, or an email address"
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
    >
      {noMatches && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query.includes("@") ? "No one on Blip with that address yet" : "No matching device or contact"}
          description="Try a name or the full email address of someone who uses Blip."
        />
      )}
      <List.Section
        title="Your Devices"
        subtitle={devices.length ? `${devices.filter((d) => d.online).length} online` : undefined}
      >
        {visibleDevices.map((d) => (
          <List.Item
            key={d.id}
            id={d.id}
            title={d.title}
            subtitle={d.device.kind === "GenericDevice" ? undefined : d.device.kind}
            icon={deviceIcon(d.device.kind, d.online)}
            accessories={[presenceAccessory(d.online, relativeTime(d.lastOnline))]}
            actions={
              <RecipientActions
                recipient={d}
                summary={summary.label}
                onSend={send}
                onChangeFiles={onChangeFiles}
                files={files}
              />
            }
          />
        ))}
      </List.Section>
      <List.Section title="Contacts">
        {visiblePeople.map((p) => (
          <PersonItem
            key={p.id}
            person={p}
            summary={summary.label}
            onSend={send}
            onChangeFiles={onChangeFiles}
            files={files}
          />
        ))}
      </List.Section>
      {found.length > 0 && (
        <List.Section title="People on Blip">
          {found.map((p) => (
            <PersonItem
              key={p.id}
              person={p}
              summary={summary.label}
              onSend={send}
              onChangeFiles={onChangeFiles}
              files={files}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PersonItem(props: {
  person: PersonRecipient;
  summary: string;
  files: string[];
  onSend: (r: Recipient) => void;
  onChangeFiles?: () => void;
}) {
  const { person } = props;
  const accessories: List.Item.Accessory[] = [];
  if (person.onlineDevices > 0) {
    accessories.push({
      tag: { value: "Online", color: Color.Green },
      tooltip: `${person.onlineDevices} device(s) online`,
    });
  } else if (person.lastInteraction) {
    accessories.push({ text: relativeTime(person.lastInteraction), tooltip: "Last transfer with this contact" });
  }
  return (
    <List.Item
      id={person.id}
      title={person.title}
      subtitle={person.email}
      icon={personIcon(person)}
      keywords={[person.email]}
      accessories={accessories}
      actions={<RecipientActions recipient={person} {...props} />}
    />
  );
}

function RecipientActions({
  recipient,
  summary,
  files,
  onSend,
  onChangeFiles,
}: {
  recipient: Recipient;
  summary: string;
  files: string[];
  onSend: (r: Recipient) => void;
  onChangeFiles?: () => void;
}) {
  return (
    <ActionPanel title={`${summary} → ${recipient.title}`}>
      <ActionPanel.Section>
        <Action title={`Send to ${recipient.title}`} icon={Icon.Upload} onAction={() => onSend(recipient)} />
        {onChangeFiles && (
          <Action
            title="Choose Different Files"
            icon={fileManagerIcon}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={onChangeFiles}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {recipient.kind === "person" && recipient.email && (
          <Action.CopyToClipboard title="Copy Email" content={recipient.email} shortcut={Shortcuts.copyEmail} />
        )}
        <Action.ShowInFinder
          title={files.length === 1 ? `Show File in ${fileManager}` : `Show Files in ${fileManager}`}
          path={files[0]}
          shortcut={Shortcuts.showInFileManager}
        />
        <Action.Push
          title="Show Transfers"
          icon={Icon.List}
          target={<TransfersList />}
          shortcut={Shortcuts.showTransfers}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function matches(query: string, ...fields: string[]): boolean {
  if (!query) return true;
  return fields.some((f) => f.toLowerCase().includes(query));
}

/**
 * Asks Blip to search its directory for the typed name or email, and tidies up
 * the search entry when the query changes or the view closes.
 */
function useServerSearch(searchText: string, state: BlipState | undefined): string | undefined {
  const [searchId, setSearchId] = useState<string>();
  const current = useRef<string | undefined>(undefined);

  useEffect(() => {
    const query = searchText.trim();
    const previous = current.current;
    if (previous) {
      void dispatch("AbandonSearch", { id: previous }).catch(() => undefined);
      current.current = undefined;
      setSearchId(undefined);
    }
    if (query.length < SEARCH_MIN_LENGTH || !state) return;
    const timer = setTimeout(() => {
      const id = `raycast-${randomUUID()}`;
      current.current = id;
      setSearchId(id);
      void dispatch("Search", { id, query }).catch(() => undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `state` is deliberately not a dependency: we only need it to exist.
  }, [searchText]);

  useEffect(
    () => () => {
      if (current.current) void dispatch("AbandonSearch", { id: current.current }).catch(() => undefined);
    },
    [],
  );

  return searchId;
}

function serverResults(state: BlipState, searchId: string | undefined): PersonRecipient[] {
  if (!searchId) return [];
  const search = state.searches?.[searchId];
  if (!search) return [];
  const ids = [...(search.local_results ?? []), ...(search.server_results ?? [])]
    .map((p) => p.user_id)
    .filter((id): id is string => Boolean(id));
  const me = state.auth?.user_id;
  const seen = new Set<string>();
  const results: PersonRecipient[] = [];
  for (const id of ids) {
    if (seen.has(id) || id === me) continue;
    seen.add(id);
    const user = state.users?.discovered?.[id];
    if (user) results.push(toPerson(state, user));
  }
  return results;
}

export function fileLabel(file: string): string {
  return path.basename(file);
}
