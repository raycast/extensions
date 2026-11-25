/**
 * Search Memory: the decisions, preferences and notes Mash remembers from your
 * chats, grouped by where they apply, each with the quotes behind it.
 */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { useMemo } from "react";
import { ChatMessages } from "./chatMessages";
import { chatLink, findMash, type Hit, hasDesktopApp, MashError, mashEnvironment } from "./mash";
import {
  type Memory,
  type MemoryKind,
  memoryMarkdown,
  parseRecords,
  RECORD_PAGE,
  type RecordPage,
  recordsArguments,
} from "./records";

interface Preferences {
  readonly mashPath?: string;
}

type Choice = "all" | MemoryKind;

const kinds: { readonly value: MemoryKind; readonly title: string; readonly icon: Icon; readonly tint: Color }[] = [
  { value: "decision", title: "Decisions", icon: Icon.CheckCircle, tint: Color.Blue },
  { value: "preference", title: "Preferences", icon: Icon.Heart, tint: Color.Magenta },
  { value: "note", title: "Notes", icon: Icon.Document, tint: Color.Yellow },
];

/** One page of `mash memory`. Mash answers with JSON even when it fails, so its message is kept. */
function page(mash: string, where: RecordPage): Promise<ReturnType<typeof parseRecords>> {
  return new Promise((resolve, reject) => {
    execFile(
      mash,
      recordsArguments(where),
      { maxBuffer: 64 * 1024 * 1024, env: mashEnvironment() },
      (error, stdout) => {
        if (stdout.trim()) {
          try {
            resolve(parseRecords(stdout));
          } catch (parseError) {
            reject(parseError);
          }
          return;
        }
        reject(error ?? new MashError("Mash stopped without an answer."));
      },
    );
  });
}

/** What Search Memory lists, and whether it reaches every machine. */
interface Remembered {
  readonly memories: Memory[];
  /** Why only this machine's records are listed, when they are. */
  readonly onlyHere?: string;
}

/**
 * Every machine's current records, from the shared index, so a decision made
 * in a chat on another machine is found here too. A machine that has not
 * joined one, or cannot reach it, lists its own and says so. Fifty pages is
 * far more than a group of machines keeps.
 */
async function everything(mash: string): Promise<Remembered> {
  const all: Memory[] = [];
  try {
    let cursor: string | undefined;
    for (let pages = 0; pages < 50; pages += 1) {
      const answer = await page(mash, cursor ? { shared: true, cursor } : { shared: true });
      all.push(...answer.memories);
      if (!answer.cursor) return { memories: all };
      cursor = answer.cursor;
    }
    return { memories: all };
  } catch (error) {
    const here: Memory[] = [];
    let offset: number | null = 0;
    for (let pages = 0; offset !== null && pages < 10; pages += 1) {
      const answer = await page(mash, { shared: false, offset });
      here.push(...answer.memories);
      offset = answer.memories.length < RECORD_PAGE ? null : answer.next;
    }
    return { memories: here, onlyHere: error instanceof Error ? error.message : String(error) };
  }
}

export default function Command() {
  const { mashPath } = getPreferenceValues<Preferences>();
  const mash = useMemo(() => findMash(mashPath, homedir(), existsSync), [mashPath]);
  const hasApp = useMemo(() => hasDesktopApp(homedir(), existsSync), []);
  const [choice, setChoice] = useCachedState<Choice>("memory-kind", "all");
  const { data, isLoading, error, revalidate } = usePromise(everything, [mash ?? ""], {
    execute: mash !== undefined,
    failureToastOptions: { title: "Mash couldn’t list what it remembers" },
  });

  if (!mash) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title={mashPath ? "Mash isn’t at the location you set" : "Mash isn’t installed"}
          actions={
            <ActionPanel>
              <Action title="Set Mash Location" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const shown = (data?.memories ?? []).filter((memory) => choice === "all" || memory.kind === choice);
  // Sections in the order their newest record appears, so recent work leads.
  const sections = new Map<string, Memory[]>();
  for (const memory of shown) sections.set(memory.scope, [...(sections.get(memory.scope) ?? []), memory]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={shown.length > 0}
      searchBarPlaceholder={
        data?.onlyHere ? "Search what Mash remembers on this machine" : "Search what Mash remembers, on every machine"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Kind of record" value={choice} onChange={(value) => setChoice(value as Choice)}>
          <List.Dropdown.Item title="Everything" value="all" icon={Icon.Bookmark} />
          {kinds.map((kind) => (
            <List.Dropdown.Item
              key={kind.value}
              title={kind.title}
              value={kind.value}
              icon={{ source: kind.icon, tintColor: kind.tint }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mash couldn’t list what it remembers"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Bookmark}
          title={isLoading ? "Reading what Mash remembers…" : "Nothing remembered yet"}
          description={[
            "Mash keeps the decisions and preferences your agents record from your chats, and the notes you ask them to keep.",
            data?.onlyHere ? `This lists only this machine's: ${data.onlyHere}` : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}
      {[...sections].map(([scope, memories]) => (
        <List.Section key={scope} title={scope} subtitle={String(memories.length)}>
          {memories.map((memory) => (
            <MemoryItem key={memory.id} memory={memory} mash={mash} hasApp={hasApp} reload={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function MemoryItem({
  memory,
  mash,
  hasApp,
  reload,
}: {
  memory: Memory;
  mash: string;
  hasApp: boolean;
  reload: () => void;
}) {
  const kind = kinds.find((entry) => entry.value === memory.kind) ?? kinds[0];
  const source = memory.evidence[0];
  // The chat a record came from, at the message it quotes.
  const hit: Hit | undefined = source && {
    chatId: source.chatId,
    messageId: source.messageId,
    matched: true,
    title: memory.statement,
    agent: "",
    project: "",
    updatedAt: undefined,
    passage: source.quote,
    // A record from another machine cites that machine's chat.
    ...(memory.machine ? { machine: memory.machine } : {}),
  };
  return (
    <List.Item
      icon={{ source: kind.icon, tintColor: kind.tint }}
      title={memory.statement}
      keywords={[memory.scope, memory.kind, ...memory.conditions]}
      accessories={memory.candidate ? [{ tag: { value: "unconfirmed", color: Color.Orange } }] : []}
      detail={
        <List.Item.Detail
          markdown={memoryMarkdown(memory)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Kind">
                <List.Item.Detail.Metadata.TagList.Item text={kind.title.slice(0, -1)} color={kind.tint} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Applies to" text={memory.scope} />
              {memory.machine ? <List.Item.Detail.Metadata.Label title="Machine" text={memory.machine} /> : null}
              {memory.recordedAt ? (
                <List.Item.Detail.Metadata.Label title="Recorded" text={memory.recordedAt.toLocaleString()} />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Confirmed"
                text={memory.candidate ? "Not yet: an agent proposed it" : "Yes"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Statement" content={memory.statement} />
          {hit && hasApp ? (
            <Action.Open title="Open Source Chat in Mash" icon={Icon.AppWindow} target={chatLink(hit)} />
          ) : null}
          {hit ? (
            <Action.Push
              title="Read Source Messages"
              icon={Icon.Text}
              shortcut={Keyboard.Shortcut.Common.Open}
              target={
                <ChatMessages hit={hit} mash={mash}>
                  {hasApp ? (
                    <Action.Open title="Open Chat in Mash" icon={Icon.AppWindow} target={chatLink(hit)} />
                  ) : null}
                  <Action.CopyToClipboard title="Copy Statement" content={memory.statement} />
                </ChatMessages>
              }
            />
          ) : null}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Record ID"
              content={memory.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={reload}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
