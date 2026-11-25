/**
 * Reading a chat's messages with `mash view`, shared by the commands that
 * open one: around a match, or from the start of a chat.
 */
import { ActionPanel, Detail } from "@raycast/api";
import { useExec } from "@raycast/utils";
import type { ReactNode } from "react";
import { type Hit, literal, MashError, mashEnvironment, parseView, rendered, viewArguments } from "./mash";

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
    : (data ?? [])
        .map((message) => {
          const match = hit.matched && message.id === hit.messageId;
          const heading = match ? `### ${message.role} · the match` : `### ${message.role}`;
          return `${heading}\n\n${rendered(message.content)}`;
        })
        .join("\n\n");
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={hit.title}
      markdown={markdown}
      actions={<ActionPanel>{children}</ActionPanel>}
    />
  );
}
