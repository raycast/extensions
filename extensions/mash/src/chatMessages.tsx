/**
 * Reading a chat's messages with `mash view`, shared by the commands that
 * open one: around a match, or from the start of a chat.
 */
import { ActionPanel, Detail } from "@raycast/api";
import { useExec } from "@raycast/utils";
import type { ReactNode } from "react";
import {
  conversation,
  type Hit,
  literal,
  MashError,
  mashEnvironment,
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
  const markdown = error
    ? `**Mash couldn’t read this chat.**\n\n${literal(error.message)}`
    : conversation(data ?? [], hit.messageId)
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
        .join("\n\n---\n\n");
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={hit.title}
      markdown={markdown}
      actions={<ActionPanel>{children}</ActionPanel>}
    />
  );
}
