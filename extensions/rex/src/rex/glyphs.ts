import { GLYPH_CATALOG } from "./glyph-catalog";
import type { RexBlock } from "./types";

/** Programs Rex's catalog does not list by command but that should still get a chip. */
const EXTRA_COMMANDS: Record<string, string> = {
  "claude-code": "claude",
  "cursor-agent": "cursor",
  "github-copilot": "copilot",
  gh: "github",
  nodejs: "node",
  ipython: "python",
  rustup: "rust",
  vi: "vim",
  helix: "hx",
  k9s: "kube",
  pg_dump: "postgres",
  tail: "log",
  less: "log",
  zsh: "terminal",
  bash: "terminal",
  fish: "terminal",
  sh: "terminal",
  dash: "terminal",
  nu: "terminal",
  login: "terminal",
  tmux: "terminal",
};

/** Patterns for versioned or suffixed binaries such as `python3.9` or `node22`. */
const PREFIXES: [RegExp, string][] = [
  [/^python\d/, "python"],
  [/^node\d/, "node"],
  [/^ruby\d/, "ruby"],
  [/^swift-/, "swift"],
  [/^docker-/, "docker"],
  [/^git-/, "git"],
  [/^terraform-/, "terraform"],
];

const BY_COMMAND = new Map<string, string>();
const TITLES = new Map<string, string>();
for (const entry of GLYPH_CATALOG) {
  BY_COMMAND.set(entry.glyph, entry.glyph);
  TITLES.set(entry.glyph, entry.title);
  for (const command of entry.commands) BY_COMMAND.set(command.toLowerCase(), entry.glyph);
}
for (const [command, glyph] of Object.entries(EXTRA_COMMANDS)) BY_COMMAND.set(command, glyph);

function resolve(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const key = name.replace(/^-/, "").toLowerCase();
  const direct = BY_COMMAND.get(key);
  if (direct) return direct;
  for (const [pattern, glyph] of PREFIXES) if (pattern.test(key)) return glyph;
  return undefined;
}

/**
 * The Rex program glyph for a block, by the same signals Rex uses: the app that reports
 * status, then the script an interpreter runs, then what the foreground program was
 * invoked as, then its executable name. Shells fall back to the terminal chip.
 */
export function glyphFor(block: RexBlock): string | undefined {
  const candidates = [
    block.status[0]?.app,
    block.process?.script, // `node codex` is Codex, not Node
    block.process?.argv0,
    block.process?.invoked,
    block.process?.path,
    block.process?.name,
  ];
  for (const candidate of candidates) {
    const glyph = resolve(candidate);
    if (glyph) return glyph;
  }
  return block.process ? "terminal" : undefined;
}

/** Rex's display name for a program glyph, such as "Claude Code" for `claude`. */
export function glyphTitle(glyph: string): string | undefined {
  return TITLES.get(glyph);
}
