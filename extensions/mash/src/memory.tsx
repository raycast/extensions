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
import { agentIcon } from "./agentIcon";
import { agentName, chatLink, findMash, type Hit, hasDesktopApp, MashError, mashEnvironment } from "./mash";
import {
  type Memory,
  type MemoryKind,
  type ScopeKind,
  memoryMarkdown,
  parseRecords,
  type RecordPage,
  recordedAgent,
  recordsArguments,
} from "./records";

type Choice = "all" | MemoryKind;

// Neutral icons, one shape per kind, so the kind reads without colour
// competing with the agent tiles. Raycast has no sliders icon, so a
// preference is the switch.
const kinds: { readonly value: MemoryKind; readonly title: string; readonly icon: Icon }[] = [
  { value: "decision", title: "Decisions", icon: Icon.Bookmark },
  { value: "preference", title: "Preferences", icon: Icon.Switch },
  { value: "note", title: "Notes", icon: Icon.Document },
];

const kindIcon = (icon: Icon) => ({ source: icon, tintColor: Color.SecondaryText });

// Where a record applies, one shape per scope kind, as the dashboard shows it
// (a person, a repository, a project folder, one chat). Raycast has no
// folder-with-branch icon, so a repository is the code mark.
const scopeIcons: Readonly<Record<ScopeKind, Icon>> = {
  personal: Icon.Person,
  repository: Icon.Code,
  local_project: Icon.Folder,
  chat: Icon.Bubble,
};

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
      // Mash says when there is another page; a page can hold fewer
      // memories than asked for when it skips a record this cannot show.
      offset = answer.next;
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
          <List.Dropdown.Item title="Everything" value="all" icon={kindIcon(Icon.Tray)} />
          {kinds.map((kind) => (
            <List.Dropdown.Item key={kind.value} title={kind.title} value={kind.value} icon={kindIcon(kind.icon)} />
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
  const recorder = recordedAgent(memory.recordedBy);
  const kindName = kind.title.slice(0, -1);
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
      icon={{ value: kindIcon(kind.icon), tooltip: kindName }}
      title={memory.statement}
      keywords={[memory.scope, memory.kind, ...memory.conditions]}
      accessories={
        memory.candidate
          ? [
              {
                tag: { value: "unconfirmed", color: Color.Orange },
                tooltip: "An agent proposed this from a chat; it is not confirmed yet",
              },
            ]
          : []
      }
      detail={
        <List.Item.Detail
          markdown={memoryMarkdown(memory)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Kind" text={kindName} icon={kindIcon(kind.icon)} />
              <List.Item.Detail.Metadata.Label
                title="Applies to"
                text={memory.scope}
                icon={kindIcon(scopeIcons[memory.scopeKind])}
              />
              {memory.machine ? (
                <List.Item.Detail.Metadata.Label title="Machine" text={memory.machine} icon={kindIcon(Icon.Monitor)} />
              ) : null}
              {/* The recorder names itself; its tile is shown only for a name that is exactly one of Mash's agents. */}
              {memory.recordedBy ? (
                <List.Item.Detail.Metadata.Label
                  title="Agent"
                  text={recorder ? agentName(recorder) : memory.recordedBy}
                  icon={recorder ? agentIcon(recorder) : undefined}
                />
              ) : null}
              {memory.recordedAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Recorded"
                  text={memory.recordedAt.toLocaleString()}
                  icon={kindIcon(Icon.Calendar)}
                />
              ) : null}
              {/* Mash keeps who recorded a record, not who established it, so
                  this does not claim the person confirmed it. */}
              <List.Item.Detail.Metadata.Label
                title="Confirmed"
                text={memory.candidate ? "Not yet: an agent proposed it" : "Yes"}
                icon={
                  memory.candidate
                    ? { source: Icon.CircleProgress50, tintColor: Color.Orange }
                    : { source: Icon.CheckCircle, tintColor: Color.Green }
                }
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {hit ? (
            <Action.Push
              title="Read Source Messages"
              icon={Icon.Text}
              target={
                <ChatMessages hit={hit} mash={mash}>
                  {hasApp ? (
                    <Action.Open title="Open Chat in Mash" icon={Icon.AppWindow} target={chatLink(hit)} />
                  ) : null}
                  <Action.CopyToClipboard title="Copy Statement" icon={Icon.QuoteBlock} content={memory.statement} />
                </ChatMessages>
              }
            />
          ) : null}
          {hit && hasApp ? (
            <Action.Open title="Open Source Chat in Mash" icon={Icon.AppWindow} target={chatLink(hit)} />
          ) : null}
          <Action.CopyToClipboard title="Copy Statement" icon={Icon.QuoteBlock} content={memory.statement} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Record ID"
              icon={Icon.Hashtag}
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
