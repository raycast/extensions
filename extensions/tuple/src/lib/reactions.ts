import { jsonArgs, runTuple, stripAnsi } from "./tuple";
import { TupleError, TupleErrorKind } from "./types";

/** Ask the installed CLI for its canonical sound and webcam reaction arguments, without sending one. */
export async function listReactions(): Promise<string[]> {
  const output = await runTuple(["__completeNoDesc", "call", "react", ""]);
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const directive = lines.pop();
  if (!directive || !/^:\d+$/.test(directive) || (Number(directive.slice(1)) & 1) !== 0) {
    throw new TupleError(TupleErrorKind.Unknown, "The installed Tuple CLI could not list its reactions.");
  }
  return [...new Set(lines.map((line) => line.split("\t")[0]).filter(Boolean))];
}

export function reactionTitle(reaction: string): string {
  return reaction.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function sendReaction(reaction: string): Promise<void> {
  if (!(await listReactions()).includes(reaction)) {
    throw new TupleError(TupleErrorKind.Unknown, "This reaction is no longer available. Refresh the reaction list.");
  }
  await runTuple(jsonArgs("call", "react", reaction));
}
