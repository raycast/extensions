import { z } from "zod";
import { basename } from "node:path";

export const commandSchema = z.object({
  id: z.string().uuid(),
  alias: z.string().nullish(),
  workingDirectory: z.string(),
  command: z.string(),
  workspaceIDs: z.array(z.string()),
  state: z
    .object({
      status: z.enum(["running", "idle"]),
      hasTerminalSession: z.boolean(),
    })
    .optional(),
  detectedEndpoints: z
    .array(
      z.object({
        scheme: z.string(),
        port: z.number().int().min(1).max(65535),
      }),
    )
    .default([]),
  runtimeError: z.string().optional(),
});
export const snapshotSchema = z.object({
  commands: z.array(commandSchema),
  workspaces: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      commandIDs: z.array(z.string()),
    }),
  ),
});
export type SavedCommand = z.infer<typeof commandSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export const title = (command: SavedCommand) =>
  command.alias ?? command.workingDirectory;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

// Mirrors ShellClickCore.SearchTextMatcher, including separator-insensitive fuzzy matching.
export function matchScore(value: string, term: string): number {
  const needle = normalize(term);
  if (!needle)
    return value.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ? 2 : 0;
  const haystack = normalize(value);
  if (haystack === needle) return 3;
  if (haystack.includes(needle)) return 2;
  let index = 0;
  const letters = [...needle];
  for (const letter of haystack) if (letter === letters[index]) index++;
  return index === letters.length ? 1 : 0;
}
export function matches(values: string[], query: string): boolean {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => values.some((value) => matchScore(value, term) > 0));
}
export function searchCommands(
  commands: SavedCommand[],
  query: string,
): SavedCommand[] {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  return commands
    .map((command, index) => {
      const names = [command.alias ?? "", basename(command.workingDirectory)];
      const body = [
        command.command,
        command.workingDirectory,
        ...command.detectedEndpoints.map((endpoint) => String(endpoint.port)),
      ];
      const score = (values: string[]) =>
        terms.reduce(
          (sum, term) =>
            sum + Math.max(...values.map((value) => matchScore(value, term))),
          0,
        );
      return {
        command,
        index,
        name: score(names),
        body: score(body),
        matches: matches([...names, ...body], query),
      };
    })
    .filter((item) => item.matches)
    .sort((a, b) => b.name - a.name || b.body - a.body || a.index - b.index)
    .map((item) => item.command);
}
export function commandURL(action: "open" | "edit", id: string): string {
  return `shell-click://${action}/${z.string().uuid().parse(id)}`;
}
