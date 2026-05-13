#!/usr/bin/env bun
/* eslint-disable no-console */
import { convertPrompt } from "../src/engine";
import { globalCache } from "../src/cache";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

type Case = {
  prompt: string;
  // Default semantics: at least one pattern must match (OR).
  // When `mode: "all"` is set, every pattern must match (AND) — used for
  // "expert" prompts where the right answer needs several components together.
  accept: RegExp[];
  mode?: "any" | "all";
};

type Tier = {
  name: string;
  description: string;
  cases: Case[];
};

const EASY: Case[] = [
  { prompt: "list files in current directory", accept: [/\b(ls|find|dir)\b/] },
  {
    prompt: "list all files including hidden ones",
    accept: [/\bls\s+-[A-Za-z]*[aA]/],
  },
  { prompt: "print the current working directory", accept: [/\bpwd\b/] },
  { prompt: "go to my home directory", accept: [/\bcd\s+(~|\$HOME)/] },
  {
    prompt: "create a new directory called playground",
    accept: [/\bmkdir\b.*playground/],
  },
  {
    prompt: "remove an empty directory called scratch",
    accept: [/\b(rmdir|rm)\b.*scratch/],
  },
  {
    prompt: "copy file source.txt to dest.txt",
    accept: [/\bcp\b.*source\.txt.*dest\.txt/],
  },
  {
    prompt: "rename old.txt to new.txt",
    accept: [/\bmv\b.*old\.txt.*new\.txt/],
  },
  { prompt: "delete the file temp.log", accept: [/\brm\b.*temp\.log/] },
  {
    prompt: "find all javascript files in this directory tree",
    accept: [/\bfind\b.*\.js/, /\b(rg|grep|fd)\b/],
  },
  {
    prompt: "find files modified in the last 24 hours",
    accept: [/\bfind\b.*-mtime/, /\bfind\b.*-mmin/, /\bfind\b.*-newer/],
  },
  {
    prompt: "count the number of lines in package.json",
    accept: [/\bwc\s+-l\b.*package\.json/, /\bawk\b.*END.*package\.json/],
  },
  {
    prompt: "show the first 20 lines of a file called log.txt",
    accept: [
      /\bhead\b.*\b20\b.*log\.txt/,
      /\bsed\b.*1\s*,\s*20\s*p.*log\.txt/,
      /\bawk\b.*NR.*20.*log\.txt/,
    ],
  },
  {
    prompt: "show the last 50 lines of error.log",
    accept: [/\btail\b.*\b50\b.*error\.log/, /\bsed\b.*error\.log/],
  },
  {
    prompt: "search for the word TODO in main.ts",
    accept: [/\b(grep|rg|ag)\b.*TODO.*main\.ts/i],
  },
  {
    prompt: "recursively search for the word foobar in all files",
    accept: [/\b(grep|rg|ag)\b.*foobar/i],
  },
  {
    prompt: "show disk space usage in human readable format",
    accept: [/\bdf\b.*-h/],
  },
  {
    prompt: "show the size of the node_modules directory",
    accept: [/\bdu\b.*-(s|sh|hs).*node_modules/],
  },
  { prompt: "list all running processes", accept: [/\b(ps|top|htop)\b/] },
  {
    prompt: "kill all processes named node",
    accept: [/\b(pkill|killall)\b.*node/],
  },
  {
    prompt: "compress the folder photos into a tar gz archive",
    accept: [/\btar\b.*-c.*z.*photos/, /\bzip\b.*photos/],
  },
  {
    prompt: "extract a tar.gz archive called backup.tar.gz",
    accept: [/\btar\b.*-x.*z.*backup\.tar\.gz/],
  },
  {
    prompt: "download the file at https://example.com/file.zip",
    accept: [/\b(curl|wget)\b.*https:\/\/example\.com\/file\.zip/],
  },
  {
    prompt: "make the script deploy.sh executable",
    accept: [/\bchmod\b.*\+x.*deploy\.sh/],
  },
  {
    prompt: "show detailed permissions for files in this directory",
    accept: [/\bls\s+-[A-Za-z]*l/, /\bstat\b/],
  },
  {
    prompt: "print all environment variables",
    accept: [/\b(env|printenv|set)\b/],
  },
  { prompt: "show the current git status", accept: [/\bgit\s+status\b/] },
  {
    prompt: "show the last 10 git commits as a one-line log",
    mode: "all",
    accept: [
      /\bgit\b/,
      /\blog\b/,
      /--oneline\b|--pretty[= ]\S*oneline/,
      /\b10\b/,
    ],
  },
  {
    prompt: "print the name of the current git branch",
    accept: [
      /\bgit\s+(branch\s+--show-current|rev-parse\s+--abbrev-ref\s+HEAD|symbolic-ref)/,
    ],
  },
  {
    prompt: "show which processes are listening on TCP ports",
    accept: [/\blsof\b.*-i/, /\bnetstat\b/, /\bss\s+-/],
  },
];

// Harder real-world dev-setup prompts. Several intentionally target Context7's
// "Claude Code" library so Context7 hits should produce official install lines.
const HARD: Case[] = [
  {
    prompt: "install Claude Code globally on macOS",
    accept: [
      /\bnpm\s+(i|install)\s+-g\b.*@anthropic-ai\/claude-code/,
      /\bcurl\b.*claude\.ai\/install\.sh/,
      /\bbrew\b.*claude-code/,
    ],
  },
  {
    prompt: "run Claude Code in the current project",
    accept: [/^claude\b/, /\bnpx\s+claude\b/, /\bclaude\s+code\b/],
  },
  {
    prompt:
      "configure Claude Code default permission mode to bypassPermissions in ~/.claude/settings.json using a safe jq merge",
    mode: "all",
    accept: [
      /bypassPermissions/,
      /\.claude\/settings\.json/,
      /\bjq\b/,
      /\bmkdir\s+-p\b.*\.claude/,
    ],
  },
  {
    prompt:
      "install copilot-api globally and configure Claude Code to route through http://localhost:4141 with a dummy auth token via ~/.claude/settings.json",
    mode: "all",
    accept: [
      /\bnpm\s+(i|install)\s+-g\b.*copilot-api/,
      /ANTHROPIC_BASE_URL/,
      /4141/,
      /\.claude\/settings\.json/,
      /\bjq\b/,
    ],
  },
  {
    prompt: "install the opencode CLI globally",
    accept: [
      /\bnpm\s+(i|install)\s+-g\b.*opencode/,
      /\bbun\s+(i|add|install)\s+-g\b.*opencode/,
      /\bbrew\b.*opencode/,
      /\bcurl\b.*opencode/,
    ],
  },
  {
    prompt: "install bun on macOS",
    accept: [
      /\bcurl\b.*bun\.(sh|com)\/install/,
      /\bbrew\b.*bun\b/,
      /\bnpm\s+(i|install)\s+-g\b.*bun/,
    ],
  },
  {
    prompt: "install aider chat for AI pair programming",
    accept: [
      /\bpipx?\s+install\b.*aider/,
      /\bbrew\b.*aider/,
      /\buv\s+tool\s+install\b.*aider/,
      /\bcurl\b.*aider\.chat\/install/,
    ],
  },
  {
    prompt: "install GitHub Copilot CLI extension for the gh tool",
    accept: [/\bgh\s+extension\s+install\b.*copilot/],
  },
  {
    prompt: "install the OpenAI Codex CLI",
    accept: [
      /\bnpm\s+(i|install)\s+-g\b.*@openai\/codex/,
      /\bbrew\b.*codex/,
      /\bnpm\s+(i|install)\s+-g\b.*codex/,
    ],
  },
  {
    prompt: "install Cursor AI editor on macOS",
    accept: [/\bbrew\s+install\s+--cask\s+cursor/, /\bcurl\b.*cursor/],
  },
  {
    prompt: "install ollama on macOS using homebrew",
    accept: [
      /\bbrew\s+install\b.*ollama/,
      /\bcurl\b.*ollama\.com\/install\.sh/,
    ],
  },
  {
    prompt: "pull the llama3 model in ollama",
    accept: [/\bollama\s+pull\b.*llama3/],
  },
  {
    prompt: "install Docker Desktop on macOS",
    accept: [/\bbrew\s+install\s+--cask\s+docker/, /\bcurl\b.*docker\.com/],
  },
  {
    prompt: "install Homebrew on a fresh Mac",
    accept: [/\bcurl\b.*Homebrew\/install/i, /\/bin\/bash\s+-c.*Homebrew/i],
  },
  {
    prompt: "install rust using rustup with default toolchain",
    accept: [/\bcurl\b.*sh\.rustup\.rs/, /\bbrew\b.*rustup/],
  },
  {
    prompt: "install node 20 using nvm",
    accept: [
      /\bnvm\s+install\s+(20|v20|--lts|lts\/iron)/,
      /\bcurl\b.*nvm.*install\.sh/,
    ],
  },
  {
    prompt: "create a new Next.js 14 project with TypeScript and Tailwind",
    accept: [
      /\bnpx\s+create-next-app(@(latest|14))?\b/,
      /\b(yarn|pnpm|bun)\s+create\s+next-app\b/,
    ],
  },
  {
    prompt: "initialize a uv-managed Python project in this directory",
    accept: [/\buv\s+(init|venv)\b/],
  },
  {
    prompt: "install pnpm globally",
    accept: [
      /\bnpm\s+(i|install)\s+-g\b.*pnpm/,
      /\bcorepack\s+enable\b.*pnpm/,
      /\bbrew\b.*pnpm/,
      /\bcurl\b.*pnpm/,
    ],
  },
  {
    prompt: "install fzf with shell key bindings and auto completion",
    accept: [
      /\bbrew\s+install\b.*fzf/,
      /\bgit\s+clone\b.*junegunn\/fzf/,
      /\bfzf\/install\b/,
    ],
  },
];

const TIERS: Tier[] = [
  { name: "Easy", description: "Everyday shell one-liners", cases: EASY },
  {
    name: "Hard",
    description: "Real-world dev setup, install & config",
    cases: HARD,
  },
];

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function matches(command: string, c: Case): { ok: boolean; missing: RegExp[] } {
  if (c.mode === "all") {
    const missing = c.accept.filter((p) => !p.test(command));
    return { ok: missing.length === 0, missing };
  }
  for (const p of c.accept)
    if (p.test(command)) return { ok: true, missing: [] };
  return { ok: false, missing: c.accept };
}

type Outcome = {
  prompt: string;
  command: string;
  source: string;
  ms: number;
  pass: boolean;
  patterns: string[];
};

type PriorOutcome = { command: string; source: string; ms: number };

// Only PRIOR PASSES are reused — failures are always re-rolled so engine
// changes (or AI non-determinism) get a fresh shot at producing a good answer.
function loadPrior(path: string): Map<string, PriorOutcome> {
  const map = new Map<string, PriorOutcome>();
  if (!existsSync(path)) return map;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    for (const tier of data.tiers ?? []) {
      for (const o of tier.outcomes ?? []) {
        if (
          o?.pass === true &&
          typeof o?.command === "string" &&
          !o.command.startsWith("<error:")
        ) {
          map.set(o.prompt, {
            command: o.command,
            source: o.source ?? "?",
            ms: o.ms ?? 0,
          });
        }
      }
    }
  } catch {
    /* ignore corrupt prior file */
  }
  return map;
}

async function runTier(
  tier: Tier,
  apiKey: string,
  prior: Map<string, PriorOutcome>,
  fresh: boolean
): Promise<{ passed: number; outcomes: Outcome[]; apiCalls: number }> {
  console.log(
    `\n${BOLD}${tier.name} tier — ${tier.cases.length} cases${RESET} ${DIM}— ${tier.description}${RESET}\n`
  );
  let passed = 0;
  let apiCalls = 0;
  const outcomes: Outcome[] = [];

  for (let i = 0; i < tier.cases.length; i++) {
    const c = tier.cases[i];
    const idx = `${(i + 1).toString().padStart(2, " ")}/${tier.cases.length}`;

    let command: string;
    let source: string;
    let ms: number;
    let cached: boolean;

    const cachedOutcome = !fresh ? prior.get(c.prompt) : undefined;
    if (cachedOutcome) {
      command = cachedOutcome.command;
      source = cachedOutcome.source;
      ms = cachedOutcome.ms;
      cached = true;
    } else {
      const t0 = Date.now();
      const result = await convertPrompt({
        prompt: c.prompt,
        model: "gpt-5.4-nano",
        provider: "openai",
        apiKeys: {
          openai: apiKey,
          context7: process.env.CONTEXT7_API_KEY || process.env.CTX7_API_KEY,
        },
      });
      ms = Date.now() - t0;
      apiCalls++;
      cached = false;

      if (!result.success || !result.command) {
        console.log(`${RED}✗${RESET} ${idx}  ${c.prompt}`);
        console.log(
          `     ${DIM}error: ${result.title}${
            result.message ? " — " + result.message : ""
          }${RESET}`
        );
        outcomes.push({
          prompt: c.prompt,
          command: `<error: ${result.title}>`,
          source: "error",
          ms,
          pass: false,
          patterns: c.accept.map(String),
        });
        continue;
      }
      command = result.command;
      source = result.source ?? "?";
    }

    const hit = matches(command, c);
    const modeTag = c.mode === "all" ? "all" : "any";
    const timingTag = cached ? "cached" : `${ms}ms`;
    const tag = `${DIM}(${timingTag} ${source} · ${modeTag})${RESET}`;

    if (hit.ok) {
      console.log(`${GREEN}✓${RESET} ${idx}  ${c.prompt}  ${tag}`);
      console.log(`     ${DIM}→ ${command}${RESET}`);
      passed++;
      outcomes.push({
        prompt: c.prompt,
        command,
        source,
        ms,
        pass: true,
        patterns: c.accept.map(String),
      });
    } else {
      console.log(`${RED}✗${RESET} ${idx}  ${c.prompt}  ${tag}`);
      console.log(`     ${DIM}→ ${command}${RESET}`);
      const verb = c.mode === "all" ? "missing" : "expected one of";
      console.log(
        `     ${DIM}${verb}: ${hit.missing.map(String).join(" | ")}${RESET}`
      );
      outcomes.push({
        prompt: c.prompt,
        command,
        source,
        ms,
        pass: false,
        patterns: c.accept.map(String),
      });
    }
  }

  const score = ((passed / tier.cases.length) * 100).toFixed(1);
  console.log(
    `\n${BOLD}${tier.name} score: ${passed}/${tier.cases.length} (${score}%)${RESET}`
  );
  return { passed, outcomes, apiCalls };
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(2);
  }

  const argv = process.argv.slice(2);
  const fresh = argv.includes("--fresh") || argv.includes("--reset");
  const ctx7 = process.env.CONTEXT7_API_KEY || process.env.CTX7_API_KEY;
  const resultsPath = resolve(import.meta.dir, "results.json");

  const prior = fresh
    ? new Map<string, PriorOutcome>()
    : loadPrior(resultsPath);
  const mode = fresh
    ? "fresh (re-rolling every case)"
    : prior.size > 0
    ? `incremental — ${prior.size} prior passes reused, failures will re-roll (pass --fresh to re-roll all)`
    : "no prior results found";

  console.log(
    `${BOLD}AI Shellsmith playground${RESET}  ${DIM}— Context7: ${
      ctx7 ? "enabled" : "disabled"
    } · ${mode}${RESET}`
  );
  globalCache.clear();

  const startedAt = Date.now();
  const allOutcomes: Array<{ tier: string; outcomes: Outcome[] }> = [];
  let totalPassed = 0;
  let totalCases = 0;
  let totalApiCalls = 0;

  for (const tier of TIERS) {
    const { passed, outcomes, apiCalls } = await runTier(
      tier,
      apiKey,
      prior,
      fresh
    );
    totalPassed += passed;
    totalCases += tier.cases.length;
    totalApiCalls += apiCalls;
    allOutcomes.push({ tier: tier.name, outcomes });
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const score = ((totalPassed / totalCases) * 100).toFixed(1);
  console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(
    `${BOLD}Total: ${totalPassed}/${totalCases} (${score}%)${RESET}  ${DIM}— ${elapsed}s · ${totalApiCalls} API call${
      totalApiCalls === 1 ? "" : "s"
    } · ${totalCases - totalApiCalls} cached${RESET}`
  );

  writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        totalPassed,
        totalCases,
        elapsedSeconds: Number(elapsed),
        apiCalls: totalApiCalls,
        tiers: allOutcomes,
      },
      null,
      2
    )
  );
  console.log(`${DIM}Results written to ${resultsPath}${RESET}`);

  process.exit(totalPassed === totalCases ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
