import type { Candidate } from "./engine";

/** The best candidate plus its prompt. Older entries lack the optional fields. */
export type CommandHistoryItem = Partial<Omit<Candidate, "command">> & {
  prompt: string;
  command: string;
  alternatives?: Candidate[];
};

export type Context = {
  os: string;
  shell: string;
  cwd: string;
  repoRoot: string;
};
