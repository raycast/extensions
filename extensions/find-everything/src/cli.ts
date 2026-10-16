#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import {
  Scope,
  SCOPES,
  HOME,
  IS_MAC,
  INDEX_DIR,
  FD,
  FZF,
  RG,
  SPLIT,
  OPEN_CMD,
  ensureIndex,
  rebuildIndex,
  runSearch,
  rerank,
  humanBytes,
  indexPathFor,
  shardDirFor,
  openPath,
  scopePaths,
} from "./engine";

const VERSION = "0.2.0";
const DIM = "[2m";
const BOLD = "[1m";
const RESET = "[0m";

// In a compiled binary execPath IS the tool; under `bun run` it is the
// interpreter, so re-invoke script + interpreter in that case.
const SELF = process.argv[1]?.endsWith(".ts")
  ? `${process.execPath} ${process.argv[1]}`
  : process.execPath;

interface Flags {
  scope: Scope;
  limit: number;
  tui: boolean;
  help: boolean;
  version: boolean;
}

function parseFlags(argv: string[]): { pos: string[]; flags: Flags } {
  const flags: Flags = {
    scope: "home",
    limit: 300,
    tui: false,
    help: false,
    version: false,
  };
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scope" || a === "-s") {
      flags.scope = (argv[++i] as Scope) || "home";
    } else if (a === "--limit" || a === "-n") {
      flags.limit = parseInt(argv[++i] || "300", 10) || 300;
    } else if (a === "--tui") {
      flags.tui = true;
    } else if (a === "--help" || a === "-h") {
      flags.help = true;
    } else if (a === "--version" || a === "-v") {
      flags.version = true;
    } else {
      pos.push(a);
    }
  }
  return { pos, flags };
}

const HELP = `fe — Find Everything. Blazing file search without Spotlight.

USAGE
  fe                     interactive picker (type to search, enter opens)
  fe search <query>      print ranked paths (scriptable)
  fe index [--scope s]   rebuild index for a scope (default: home)
  fe status              binaries + index health
  fe open <path>         open a file with the OS default app
  fe preview <path>      metadata + head of file (used by the picker)

FLAGS
  -s, --scope <s>        ${SCOPES.join(" | ")}   (default: home)
  -n, --limit <n>        max results              (default: 300)
      --tui              tab-separated ANSI rows for fzf reload
  -h, --help     -v, --version

Deps: fd, rg, fzf, split — index at ${INDEX_DIR}`;

async function cmdSearch(q: string, flags: Flags): Promise<void> {
  if (q.trim().length < 2) return;
  await ensureIndex(flags.scope, {}).catch(() => {});
  const out = await runSearch(q, flags.scope, flags.limit);
  const ranked = rerank(out, q);
  for (const p of ranked) {
    if (flags.tui) {
      const name = path.basename(p);
      const dir = path.dirname(p).replace(HOME, "~");
      process.stdout.write(`${p}\t${BOLD}${name}${RESET}  ${DIM}${dir}${RESET}\n`);
    } else {
      process.stdout.write(`${p}\n`);
    }
  }
}

async function cmdIndex(flags: Flags): Promise<void> {
  const t0 = Date.now();
  await rebuildIndex(flags.scope, {});
  const file = indexPathFor(flags.scope);
  const dir = shardDirFor(flags.scope);
  const lines = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split("\n").length - 1
    : 0;
  const shards = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
  const mb = fs.existsSync(file)
    ? (fs.statSync(file).size / 1e6).toFixed(0)
    : "0";
  console.log(
    `index-${flags.scope}: ${lines.toLocaleString()} entries, ${mb}MB, ${shards} shards in ${Date.now() - t0}ms`,
  );
}

function cmdStatus(): void {
  const bins: [string, string][] = [
    ["fd", FD],
    ["rg", RG],
    ["fzf", FZF],
    ["split", SPLIT],
    ["open", OPEN_CMD],
  ];
  for (const [n, b] of bins) {
    const resolved = fs.existsSync(b) ? b : `${b} (via PATH)`;
    console.log(`${n.padEnd(6)} ${resolved}`);
  }
  console.log(`\nindex dir: ${INDEX_DIR}`);
  for (const scope of SCOPES) {
    const f = indexPathFor(scope);
    const d = shardDirFor(scope);
    if (!fs.existsSync(f)) continue;
    const st = fs.statSync(f);
    const age = ((Date.now() - st.mtimeMs) / 60000).toFixed(0);
    const shards = fs.existsSync(d) ? fs.readdirSync(d).length : 0;
    console.log(
      `  ${scope.padEnd(12)} ${(st.size / 1e6).toFixed(0)}MB  ${age}min old  ${shards} shards`,
    );
  }
}

function cmdPreview(p: string): void {
  try {
    const s = fs.statSync(p);
    console.log(`${BOLD}${path.basename(p)}${RESET}`);
    console.log(`${DIM}${p.replace(HOME, "~")}${RESET}\n`);
    console.log(
      `${s.isDirectory() ? "folder" : humanBytes(s.size)} · modified ${s.mtime.toLocaleString()}`,
    );
    if (!s.isDirectory() && s.size > 0 && s.size < 2 * 1024 * 1024) {
      const head = fs.readFileSync(p, "utf8").slice(0, 4000);
      if (!head.includes("")) console.log(`\n${DIM}${head}${RESET}`);
    }
  } catch {
    console.log("file no longer exists");
  }
}

function cmdReveal(p: string): void {
  // macOS can reveal in Finder; on Linux the best equivalent is opening
  // the containing directory.
  const args = IS_MAC ? ["-R", p] : [path.dirname(p)];
  spawn(OPEN_CMD, args, { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref();
}

async function cmdTui(flags: Flags): Promise<void> {
  if (!fs.existsSync(FZF)) {
    console.error("fzf not found — install it first (brew install fzf / apt install fzf)");
    process.exit(1);
  }
  await ensureIndex(flags.scope, {}).catch(() => {});
  const search = `${SELF} search --tui --scope ${flags.scope} --limit ${flags.limit}`;
  const fz = spawn(
    FZF,
    [
      "--ansi",
      "--disabled",
      "--delimiter=\t",
      "--with-nth=2..",
      "--layout=reverse",
      "--info=inline-right",
      "--scheme=path",
      `--bind=start:reload:${search} ""`,
      `--bind=change:reload:sleep 0.08; ${search} {q} || true`,
      `--bind=enter:execute-silent(${SELF} open {1})+abort`,
      `--bind=ctrl-r:execute-silent(${SELF} index --scope ${flags.scope})+reload:${search} {q}`,
      `--bind=ctrl-o:execute-silent(${SELF} reveal {1})`,
      `--preview=${SELF} preview {1}`,
      "--preview-window=right,55%,border-left,wrap",
      `--header=Find Everything — ${flags.scope} · enter opens · ^R rebuild · ^O reveal`,
    ],
    { stdio: "inherit" },
  );
  fz.on("close", (code) => process.exit(code ?? 0));
}

async function main(): Promise<void> {
  const { pos, flags } = parseFlags(process.argv.slice(2));
  if (flags.version) return console.log(`fe ${VERSION}`);
  const [cmd, ...rest] = pos;
  if (flags.help || cmd === "help") return console.log(HELP);

  switch (cmd) {
    case "search":
      return cmdSearch(rest.join(" "), flags);
    case "index":
      return cmdIndex(flags);
    case "status":
      return cmdStatus();
    case "open":
      return openPath(rest[0]!);
    case "reveal":
      return cmdReveal(rest[0]!);
    case "preview":
      return cmdPreview(rest[0]!);
    case undefined:
    case "pick":
      return cmdTui(flags);
    default:
      // bare query: `fe foo bar` -> search directly
      return cmdSearch(pos.join(" "), flags);
  }
}

main().catch((e) => {
  console.error(`fe: ${e?.message || e}`);
  process.exit(1);
});
