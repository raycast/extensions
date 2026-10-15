import { Action, ActionPanel, Clipboard, Form, Icon, Image, showToast, Toast } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";

import { createMessage, findOrCreateDirectMessage, getSpace } from "../api/chat";
import type { Person, Space, SpaceItem } from "../api/types";
import { personInfo, type PersonInfo } from "../helpers/dm-names";
import { openInChat, showChatError } from "../helpers/feedback";
import { messageUrl } from "../helpers/links";
import {
  ALL_USERS,
  applyMentions,
  namesOfTargets,
  renderMentions,
  sanitizeMentionValues,
  type MentionMember,
  type MentionTarget,
} from "../helpers/mentions";
import {
  decodeRecipient,
  encodeRecipient,
  matchesSearch,
  parseThread,
  peopleNotInDms,
  spaceNameOf,
  typedEmail,
} from "../helpers/recipient";
import {
  decodeThreadChoice,
  encodeThreadChoice,
  NEW_THREAD_VALUE,
  PASTE_THREAD_VALUE,
  threadMode,
} from "../helpers/threads";
import { useMentionMembers } from "../hooks/useMentionMembers";
import { usePeopleSearch } from "../hooks/usePeopleSearch";
import { useRecentThreads } from "../hooks/useRecentThreads";
import { useSpaceItems } from "../hooks/useSpaceItems";

export interface SendMessageValues {
  /** `space:spaces/AAAA` or `person:someone@example.com`. */
  recipient: string;
  /** `new`, `paste` or `thread:spaces/AAAA/threads/BBBB`; absent until a space is chosen. */
  thread?: string;
  /** Only when `thread` is `paste`. */
  threadLink?: string;
  message: string;
  /** `users/{id}` or `users/all`; only for spaces and group chats. */
  mentions?: string[];
}

interface SendMessageFormProps {
  /** Space resource name to preselect. */
  recipient?: string;
  recipientTitle?: string;
  /** Person to message by email instead of a space. */
  email?: string;
  /** Thread resource name to reply in. */
  thread?: string;
  draftValues?: Partial<SendMessageValues>;
  /** Only the command's root form can keep drafts. */
  enableDrafts?: boolean;
  onSent?: () => void;
}

const MAX_ITEMS_PER_SECTION = 50;
/** Directory search starts at this many typed characters. */
const MIN_PEOPLE_QUERY = 2;

function itemIcon(item: SpaceItem): Image.ImageLike {
  if (item.avatarUrl) return { source: item.avatarUrl, mask: Image.Mask.Circle };
  if (item.kind === "dm") return getAvatarIcon(item.title);
  return item.kind === "group" ? Icon.TwoPeople : Icon.SpeechBubble;
}

function personIcon(info: PersonInfo | undefined, fallback: string): Image.ImageLike {
  return info?.photoUrl ? { source: info.photoUrl, mask: Image.Mask.Circle } : getAvatarIcon(info?.name ?? fallback);
}

function initialRecipient(props: SendMessageFormProps): string {
  if (props.recipient) return encodeRecipient({ kind: "space", name: props.recipient });
  if (props.email) return encodeRecipient({ kind: "person", email: props.email });
  const draft = decodeRecipient(props.draftValues?.recipient);
  return draft ? encodeRecipient(draft) : "";
}

/** Mentions from a draft, only when the draft's recipient is the one shown. */
function initialMentions(props: SendMessageFormProps): string[] {
  if (props.recipient || props.email) return [];
  return sanitizeMentionValues(props.draftValues?.mentions);
}

function memberIcon(member: MentionMember): Image.ImageLike {
  return member.avatarUrl ? { source: member.avatarUrl, mask: Image.Mask.Circle } : getAvatarIcon(member.name);
}

function initialThread(props: SendMessageFormProps): string {
  if (props.thread) return encodeThreadChoice(decodeThreadChoice(props.thread));
  return encodeThreadChoice(decodeThreadChoice(props.draftValues?.thread));
}

/**
 * Message form: one "To" dropdown that searches DMs, spaces and group chats by name, plus people in
 * the directory (or any typed email), then an optional thread. Clears and refocuses the message after sending.
 */
export function SendMessageForm(props: SendMessageFormProps) {
  const { items, isLoading } = useSpaceItems();
  const [search, setSearch] = useState("");
  const [initialValue] = useState(() => initialRecipient(props));
  const [selected, setSelected] = useState(initialValue);
  const [threadValue, setThreadValue] = useState(() => initialThread(props));
  const [mentionValues, setMentionValues] = useState<string[]>(() => initialMentions(props));
  const [messageText, setMessageText] = useState(props.draftValues?.message ?? "");
  // Names and photos of people picked from directory results, so the choice keeps its label.
  const [knownPeople, setKnownPeople] = useState<Record<string, PersonInfo>>(() =>
    props.email ? { [props.email.toLowerCase()]: { name: props.recipientTitle, email: props.email } } : {},
  );
  const [messageError, setMessageError] = useState<string | undefined>();
  const [recipientError, setRecipientError] = useState<string | undefined>();
  const [threadError, setThreadError] = useState<string | undefined>();
  const [linkError, setLinkError] = useState<string | undefined>();
  const messageRef = useRef<Form.TextArea>(null);

  const peopleQuery = search.trim().length >= MIN_PEOPLE_QUERY ? search.trim() : "";
  const people = usePeopleSearch(peopleQuery);
  const selectedRecipient = decodeRecipient(selected);

  const options = useMemo(() => {
    const isSelected = (item: SpaceItem) => encodeRecipient({ kind: "space", name: item.space.name }) === selected;
    const visible = items.filter((item) => matchesSearch(item, search) || isSelected(item));
    const dms = visible.filter((item) => item.kind === "dm").slice(0, MAX_ITEMS_PER_SECTION);
    const spaces = visible.filter((item) => item.kind !== "dm").slice(0, MAX_ITEMS_PER_SECTION);

    const seenEmails = new Set<string>();
    const directory: { person: Person; info: PersonInfo; email: string }[] = [];
    for (const person of peopleQuery ? peopleNotInDms(people.data ?? [], dms) : []) {
      const info = personInfo(person);
      const email = info.email?.toLowerCase();
      // People without an email can't be messaged.
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);
      directory.push({ person, info, email });
    }

    const rendered = new Set<string>([
      ...[...dms, ...spaces].map((item) => encodeRecipient({ kind: "space", name: item.space.name })),
      ...directory.map((entry) => encodeRecipient({ kind: "person", email: entry.email })),
    ]);
    const typed = typedEmail(search, [...dms.map((item) => item.email), ...directory.map((entry) => entry.email)]);
    const typedValue = typed ? encodeRecipient({ kind: "person", email: typed }) : undefined;
    if (typedValue) rendered.add(typedValue);
    // Keep the current choice listed even when the search no longer matches it.
    const keepSelected = !!selected && !rendered.has(selected);
    return { dms, spaces, directory, typed, keepSelected };
  }, [items, search, selected, peopleQuery, people.data]);

  const selectedSpaceName = selectedRecipient?.kind === "space" ? selectedRecipient.name : undefined;
  const loadedItem = selectedSpaceName ? items.find((item) => item.space.name === selectedSpaceName) : undefined;
  const loadedSpace = loadedItem?.space;
  // Until spaces load, a bare name is enough to list threads.
  const selectedSpace = useMemo<Space | undefined>(
    () => (selectedSpaceName ? (loadedSpace ?? { name: selectedSpaceName }) : undefined),
    [selectedSpaceName, loadedSpace],
  );
  const recent = useRecentThreads(selectedSpace);
  const mode = selectedSpace ? threadMode(selectedSpace) : "none";

  const threadChoice = decodeThreadChoice(threadValue);
  const threadListed = threadChoice.kind === "thread" && recent.threads.some((t) => t.name === threadChoice.name);
  const showPaste = mode === "all" || recent.threads.length > 0;
  // A choice that isn't offered (e.g. paste in a DM without threads) falls back to a new message.
  const effectiveThread = threadChoice.kind === "paste" && !showPaste ? NEW_THREAD_VALUE : threadValue;
  const showLink = !!selectedSpace && decodeThreadChoice(effectiveThread).kind === "paste";

  // Mentions: only in spaces and group chats, once the conversation's type is known.
  const showMentions = !!loadedItem && loadedItem.kind !== "dm";
  const mention = useMentionMembers(showMentions ? loadedItem?.space.name : undefined, loadedSpace?.spaceType);
  const mentionTargets = useMemo<MentionTarget[]>(() => {
    if (!showMentions) return [];
    const byUser = new Map(mention.members.map((m) => [m.user, m]));
    return mentionValues.flatMap((value): MentionTarget[] => {
      if (value === ALL_USERS) return [{ user: ALL_USERS, name: "all" }];
      const member = byUser.get(value);
      return member ? [{ user: member.user, name: member.name }] : [];
    });
  }, [showMentions, mention.members, mentionValues]);
  // A stored or stale value that isn't offered any more is left out rather than shown.
  const shownMentionValues = mentionTargets.map((t) => t.user);
  const preview =
    mentionTargets.length > 0
      ? renderMentions(applyMentions(messageText, mentionTargets), namesOfTargets(mentionTargets)).trim()
      : undefined;

  function selectedTitle(): { title: string; icon: Image.ImageLike } {
    if (selectedRecipient?.kind === "person") {
      const info = knownPeople[selectedRecipient.email];
      return {
        title: info?.name ? `${info.name} (${selectedRecipient.email})` : `Message ${selectedRecipient.email}`,
        icon: personIcon(info, selectedRecipient.email),
      };
    }
    const name = selectedRecipient?.kind === "space" ? selectedRecipient.name : selected;
    const item = items.find((i) => i.space.name === name);
    if (item) return { title: item.title, icon: itemIcon(item) };
    if (props.recipient === name && props.recipientTitle)
      return { title: props.recipientTitle, icon: Icon.SpeechBubble };
    return { title: isLoading ? "Loading conversation…" : `Conversation ${name}`, icon: Icon.SpeechBubble };
  }

  function onRecipientChange(value: string) {
    setSelected(value);
    setRecipientError(undefined);
    const next = decodeRecipient(value);
    if (next?.kind === "person") {
      const match = (people.data ?? []).map(personInfo).find((info) => info.email?.toLowerCase() === next.email);
      if (match) setKnownPeople((current) => ({ ...current, [next.email]: match }));
    }
    // Mentions belong to the conversation they were picked in.
    if (value !== selected) setMentionValues([]);
    // A thread from another conversation doesn't apply any more.
    const choice = decodeThreadChoice(threadValue);
    if (choice.kind === "thread" && (next?.kind !== "space" || spaceNameOf(choice.name) !== next.name)) {
      setThreadValue(NEW_THREAD_VALUE);
    }
    setThreadError(undefined);
  }

  async function submit(values: SendMessageValues) {
    const recipient = decodeRecipient(values.recipient);
    if (!recipient) {
      setRecipientError("Choose a conversation or person");
      return;
    }
    let thread: string | undefined;
    if (recipient.kind === "space") {
      const choice = decodeThreadChoice(values.thread);
      if (choice.kind === "thread") thread = choice.name;
      if (choice.kind === "paste") {
        try {
          thread = parseThread(values.threadLink);
        } catch (error) {
          setLinkError((error as Error).message);
          return;
        }
        if (!thread) {
          setLinkError("Paste a thread link, or choose New message");
          return;
        }
      }
      if (thread && spaceNameOf(thread) !== recipient.name) {
        (choice.kind === "paste" ? setLinkError : setThreadError)("This thread is in a different conversation");
        return;
      }
    }
    const text = recipient.kind === "space" ? applyMentions(values.message, mentionTargets) : values.message;
    if (!values.message.trim()) {
      setMessageError("Write a message");
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending message" });
    try {
      let space: Space;
      let title: string;
      if (recipient.kind === "person") {
        space = await findOrCreateDirectMessage(recipient.email);
        title = knownPeople[recipient.email]?.name ?? recipient.email;
      } else {
        const item = items.find((i) => i.space.name === recipient.name);
        space = item?.space ?? (await getSpace(recipient.name));
        title = item?.title ?? props.recipientTitle ?? space.displayName ?? "conversation";
      }
      const sent = await createMessage(space.name, text, thread);
      const link = messageUrl(space, sent);
      toast.style = Toast.Style.Success;
      toast.title = `Sent to ${title}`;
      toast.primaryAction = { title: "Open in Google Chat", onAction: () => openInChat(link) };
      toast.secondaryAction = { title: "Copy Link", onAction: () => Clipboard.copy(link) };
      messageRef.current?.reset();
      messageRef.current?.focus();
      setMessageText("");
      setMentionValues([]);
      recent.revalidate();
      props.onSent?.();
    } catch (error) {
      await toast.hide();
      await showChatError(error);
    }
  }

  const selectedExtra = options.keepSelected ? selectedTitle() : undefined;

  return (
    <Form
      isLoading={isLoading || mention.isLoading}
      enableDrafts={props.enableDrafts}
      navigationTitle={props.recipientTitle ? `Message ${props.recipientTitle}` : "Send Message"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="recipient"
        title="To"
        placeholder="Search by name or type an email"
        filtering={false}
        throttle
        isLoading={isLoading || (!!peopleQuery && people.isLoading)}
        onSearchTextChange={setSearch}
        storeValue={!props.recipient && !props.email}
        defaultValue={initialValue || undefined}
        onChange={onRecipientChange}
        error={recipientError}
        info="Search your DMs, spaces and group chats by name. From 2 letters, people in your directory are listed too. Type an email to message anyone."
      >
        {!search.trim() || !selected ? (
          <Form.Dropdown.Item value="" title="Choose a conversation or person…" icon={Icon.Person} />
        ) : null}
        {selectedExtra ? (
          <Form.Dropdown.Item value={selected} title={selectedExtra.title} icon={selectedExtra.icon} />
        ) : null}
        {options.typed ? (
          <Form.Dropdown.Item
            value={encodeRecipient({ kind: "person", email: options.typed })}
            title={`Message ${options.typed}`}
            icon={Icon.Envelope}
          />
        ) : null}
        <Form.Dropdown.Section title="Direct Messages">
          {options.dms.map((item) => (
            <Form.Dropdown.Item
              key={item.space.name}
              value={encodeRecipient({ kind: "space", name: item.space.name })}
              title={item.title}
              icon={itemIcon(item)}
            />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Spaces & Group Chats">
          {options.spaces.map((item) => (
            <Form.Dropdown.Item
              key={item.space.name}
              value={encodeRecipient({ kind: "space", name: item.space.name })}
              title={item.title}
              icon={itemIcon(item)}
            />
          ))}
        </Form.Dropdown.Section>
        {options.directory.length > 0 ? (
          <Form.Dropdown.Section title="People">
            {options.directory.map(({ person, info, email }) => (
              <Form.Dropdown.Item
                key={person.resourceName}
                value={encodeRecipient({ kind: "person", email })}
                title={info.name ? `${info.name} (${email})` : email}
                icon={personIcon(info, email)}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
      {selectedSpace ? (
        <Form.Dropdown
          id="thread"
          title="Thread"
          value={effectiveThread}
          isLoading={recent.isLoading}
          onChange={(value) => {
            setThreadValue(value);
            setThreadError(undefined);
            setLinkError(undefined);
          }}
          error={threadError}
          info={
            mode === "all"
              ? "Reply in a recent thread, or paste a thread link."
              : "Direct messages and group chats only list threads that already have replies."
          }
        >
          <Form.Dropdown.Item value={NEW_THREAD_VALUE} title="New message (no thread)" icon={Icon.Plus} />
          {threadChoice.kind === "thread" && !threadListed ? (
            <Form.Dropdown.Item value={threadValue} title={`Thread ${threadChoice.name}`} icon={Icon.Reply} />
          ) : null}
          {recent.threads.length > 0 ? (
            <Form.Dropdown.Section title="Recent Threads">
              {recent.threads.map((thread) => (
                <Form.Dropdown.Item key={thread.value} value={thread.value} title={thread.title} icon={Icon.Reply} />
              ))}
            </Form.Dropdown.Section>
          ) : null}
          {showPaste ? (
            <Form.Dropdown.Item value={PASTE_THREAD_VALUE} title="Paste a thread link…" icon={Icon.Link} />
          ) : null}
        </Form.Dropdown>
      ) : null}
      {showLink ? (
        <Form.TextField
          id="threadLink"
          title="Thread Link"
          placeholder="Thread link or spaces/…/threads/…"
          defaultValue={props.draftValues?.threadLink}
          error={linkError}
          onChange={() => linkError && setLinkError(undefined)}
          info="Reply in this thread. If it can't be replied to, the message starts a new thread."
        />
      ) : null}
      {showMentions ? (
        <Form.TagPicker
          id="mentions"
          title="Mention"
          placeholder="People to @mention"
          value={shownMentionValues}
          onChange={setMentionValues}
          info="Each person's @Name or @FirstName in the message becomes a mention; anyone not named there is mentioned at the start. @all or @everyone works the same way for everyone."
        >
          <Form.TagPicker.Item value={ALL_USERS} title="@all (everyone in this space)" icon={Icon.TwoPeople} />
          {mention.members.map((member) => (
            <Form.TagPicker.Item
              key={member.user}
              value={member.user}
              title={member.email ? `${member.name} (${member.email})` : member.name}
              icon={memberIcon(member)}
            />
          ))}
        </Form.TagPicker>
      ) : null}
      <Form.Separator />
      <Form.TextArea
        id="message"
        ref={messageRef}
        title="Message"
        placeholder="*bold* _italic_ ~strike~ `code`"
        defaultValue={props.draftValues?.message}
        error={messageError}
        onChange={(value) => {
          setMessageText(value);
          if (messageError) setMessageError(undefined);
        }}
        autoFocus={!!props.recipient || !!props.email}
      />
      {preview ? <Form.Description title="Preview" text={preview} /> : null}
    </Form>
  );
}
