/**
 * Reading a chat's messages with `mash view`, shared by the commands that
 * open one: around a match, or from the start of a chat.
 */
import { ActionPanel, Detail, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import type { ReactNode } from "react";
import { agentIcon } from "./agentIcon";
import {
  agentName,
  type ChatPosition,
  chatPosition,
  conversation,
  type Hit,
  lastActive,
  literal,
  MashError,
  mashEnvironment,
  messageCount,
  parseView,
  rendered,
  speaker,
  viewArguments,
} from "./mash";

export type Run = { stdout: string; exitCode: number | null; error?: Error };

// Mash prints a JSON answer even when it fails, so read it before the exit
// code: its message names the fix (start the search service, run mash init).
export function read<T>(parse: (stdout: string) => T) {
  return ({ stdout, exitCode, error }: Run): T => {
    if (stdout.trim()) return parse(stdout);
    throw error ?? new MashError(`Mash stopped without an answer (exit ${exitCode}).`);
  };
}

/** A chat's messages around one of them; `children` are the actions offered. */
export function ChatMessages({ hit, mash, children }: { hit: Hit; mash: string; children?: ReactNode }) {
  const { data, isLoading, error } = useExec(mash, viewArguments(hit), {
    env: mashEnvironment(),
    parseOutput: read(parseView),
    failureToastOptions: { title: "Mash couldn’t read the chat" },
  });
  const view = data ?? { messages: [] };
  const passages = conversation(view.messages, hit.messageId);
  const position = chatPosition(view, passages);
  const markdown = error
    ? `**Mash couldn’t read this chat.**\n\n${literal(error.message)}`
    : [
        // Counted from Mash's message count and the messages' places in the
        // chat, so these lines appear only when Mash gave both.
        position.earlier ? `*↑ ${messages(position.earlier)} earlier*` : "",
        passages
          .map((passage) => {
            if (passage.kind === "steps") {
              return `*${passage.count === 1 ? "1 step" : `${passage.count} steps`}: tool calls, output or thinking*`;
            }
            const { message } = passage;
            const who = speaker(message.role, hit.agent);
            const heading = passage.match && hit.matched ? `### ${who} · the match` : `### ${who}`;
            // A step is shown only when it is the match; its text is tool input or output.
            const body = message.step ? literal(message.content, 1500) : rendered(message.content);
            return `${heading}\n\n${body}`;
          })
          .join("\n\n---\n\n"),
        position.later ? `*↓ ${messages(position.later)} later*` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={hit.title}
      markdown={markdown}
      metadata={<ChatFacts hit={hit} position={position} />}
      actions={<ActionPanel>{children}</ActionPanel>}
    />
  );
}

const messages = (count: number) => (count === 1 ? "1 message" : `${count} messages`);

/**
 * The sidebar beside a chat's messages: only what Mash said about the chat.
 * A memory's source chat comes without its agent, project or time, so those
 * rows are left out rather than guessed.
 */
function ChatFacts({ hit, position }: { hit: Hit; position: ChatPosition }) {
  const count = messageCount(position);
  return (
    <Detail.Metadata>
      {hit.agent ? (
        <Detail.Metadata.Label title="Agent" text={agentName(hit.agent)} icon={agentIcon(hit.agent)} />
      ) : null}
      {hit.project ? <Detail.Metadata.Label title="Project" text={hit.project} icon={Icon.Folder} /> : null}
      {/* Mash names another machine's chats by that machine; the rest are this one's. */}
      <Detail.Metadata.Label title="Machine" text={hit.machine ?? "This machine"} icon={Icon.Monitor} />
      {hit.updatedAt ? (
        <Detail.Metadata.Label title="Last active" text={lastActive(hit.updatedAt, new Date())} icon={Icon.Clock} />
      ) : null}
      {count ? <Detail.Metadata.Label title="Messages" text={count} icon={Icon.Bubble} /> : null}
    </Detail.Metadata>
  );
}
