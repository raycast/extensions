// The setup: what is already on the viewer's GitHub, and the workflow, the README embeds and the
// one-paste prompt for a choice. The texts are glancecard's README blocks, rewritten by
// glancecard's own site editor (site/editor.js), then filled in with the viewer's login,
// repositories and the latest release, so they say what the website's editor says.
import {
  DARK_LOOKS,
  LIGHT,
  LOOKS,
  embed,
  lightOf,
  plan,
  prompt,
  workflow,
  type Choice,
  type Plan,
} from "glancecard/setup";
import { fileBases } from "glancecard";
import { gh, restOrNull, viewerLogin } from "./github";
import { DEPENDABOT, EMBED, PROMPT, README_VERSION, WORKFLOW } from "./templates";

export const WORKFLOW_PATH = ".github/workflows/glancecard.yml";
export const DEPENDABOT_PATH = ".github/dependabot.yml";

/** What the form asks: what gets a card, and the editor's choice. */
export interface Setup {
  profile: boolean;
  repos: string[];
  choice: Required<Pick<Choice, "mode" | "dark" | "light" | "look" | "calendar" | "stars" | "sections">> & {
    refresh: { often: "day" | "week"; utcHour: number; zone: string };
  };
}

/** A glancecard step found in a workflow, read back into a Setup as far as it goes. */
export interface FoundWorkflow {
  path: string;
  url: string;
  text: string;
  version: string | null;
  steps: number;
  outDir: string;
  setup: Setup;
}

export interface SetupStatus {
  login: string;
  /** The profile repository, `<login>/<login>`, where the cards live; null when it does not exist. */
  home: { branch: string; url: string } | null;
  workflow: FoundWorkflow | null;
  dependabot: { present: boolean; watchesActions: boolean };
  latest: string;
  lastRun: { conclusion: string | null; status: string; url: string; at: string } | null;
  cards: string[];
}

const decode = (content: string) => Buffer.from(content, "base64").toString("utf8");

/** Reads what the viewer already has: the profile repository, a glancecard workflow, Dependabot, the cards. */
export async function readSetupStatus(defaultZone: string): Promise<SetupStatus> {
  const login = await viewerLogin();
  const repo = `${login}/${login}`;
  const [home, latest] = await Promise.all([
    restOrNull<{ default_branch: string; html_url: string }>(`/repos/${repo}`),
    restOrNull<{ tag_name: string }>("/repos/gfazioli/glancecard/releases/latest"),
  ]);
  const status: SetupStatus = {
    login,
    home: home && { branch: home.default_branch, url: home.html_url },
    workflow: null,
    dependabot: { present: false, watchesActions: false },
    latest: latest?.tag_name ?? README_VERSION,
    lastRun: null,
    cards: [],
  };
  if (!home) return status;

  const [found, dependabot] = await Promise.all([
    findWorkflow(repo, defaultZone),
    restOrNull<{ content: string }>(`/repos/${repo}/contents/${DEPENDABOT_PATH}`),
  ]);
  status.workflow = found;
  if (dependabot) {
    status.dependabot = {
      present: true,
      watchesActions: /package-ecosystem:\s*["']?github-actions/.test(decode(dependabot.content)),
    };
  }
  if (found) {
    const file = found.path.split("/").pop();
    const [runs, cards] = await Promise.all([
      restOrNull<{
        workflow_runs: { conclusion: string | null; status: string; html_url: string; created_at: string }[];
      }>(`/repos/${repo}/actions/workflows/${file}/runs?per_page=1`),
      restOrNull<{ name: string; type: string }[]>(`/repos/${repo}/contents/${found.outDir}`),
    ]);
    const run = runs?.workflow_runs[0];
    if (run) status.lastRun = { conclusion: run.conclusion, status: run.status, url: run.html_url, at: run.created_at };
    status.cards = (Array.isArray(cards) ? cards : [])
      .filter((c) => c.type === "file" && c.name.endsWith(".svg"))
      .map((c) => c.name);
  }
  return status;
}

/** The first workflow in the profile repository that runs glancecard, glancecard.yml looked at first. */
async function findWorkflow(repo: string, defaultZone: string): Promise<FoundWorkflow | null> {
  const listing = await restOrNull<{ name: string; path: string }[]>(`/repos/${repo}/contents/.github/workflows`);
  if (!Array.isArray(listing)) return null;
  const candidates = listing
    .filter((f) => /\.ya?ml$/.test(f.name))
    .sort((a, b) => Number(b.name.includes("glancecard")) - Number(a.name.includes("glancecard")))
    .slice(0, 8);
  for (const f of candidates) {
    const file = await restOrNull<{ content: string; html_url: string }>(`/repos/${repo}/contents/${f.path}`);
    if (!file) continue;
    const text = decode(file.content);
    if (/gfazioli\/glancecard@/.test(text))
      return { path: f.path, url: file.html_url, text, ...parseWorkflow(text, defaultZone) };
  }
  return null;
}

/** A Setup read back from a workflow's first glancecard step, as far as its inputs say. */
export function parseWorkflow(file: string, defaultZone: string): Omit<FoundWorkflow, "path" | "url" | "text"> {
  // Read without its comment lines (a commented-out step is no step) and without CRLF.
  const text = file
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
  const steps = text.split(/gfazioli\/glancecard@/).length - 1;
  // The first step's `with:` block: from the first glancecard line to the next step.
  const first = text.slice(text.indexOf("gfazioli/glancecard@")).split(/\n\s*- (?:uses|name|run):/)[0];
  const input = (name: string) =>
    first.match(new RegExp(`^\\s*${name}:\\s*["']?([^"'#\\n]+?)["']?\\s*(?:#.*)?$`, "m"))?.[1].trim() ?? null;
  // `@v0.9.0`, or a SHA with its version in a comment: `@<sha> # v0.9.0`.
  const ref = first.slice("gfazioli/glancecard@".length).match(/^([^\s#"']+)["']?(?:\s*#\s*(v[\d.]+))?/);
  const reposBlock = first.match(/^\s*repos:\s*\|\s*\n((?:[ \t]+[^\s:#]+\/[^\s:#]+[ \t]*\n?)+)/m)?.[1];
  const reposLine = input("repos");
  const repos = reposBlock
    ? reposBlock
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : reposLine && reposLine !== "|"
      ? reposLine.split(/[\s,]+/).filter(Boolean)
      : [];
  const cron = text.match(/cron:\s*["']([^"']+)["']/)?.[1] ?? "30 5 * * *";
  const [, hour, , , weekday] = cron.split(/\s+/);
  return {
    version: ref ? (ref[2] ?? ref[1]) : null,
    steps,
    outDir: input("out-dir") ?? "glancecard",
    setup: {
      profile: Boolean(input("profile")),
      repos,
      choice: {
        ...choiceOfTheme(input("theme")),
        calendar: input("calendar") === "grid" ? "grid" : "chart",
        stars: input("stars-chart") ?? "steps",
        // `all` is the Action's default, the same as no line.
        sections: (input("sections")?.split(/[\s,]+/) ?? []).filter((s) => s && s !== "all"),
        refresh: {
          often: weekday && weekday !== "*" ? "week" : "day",
          utcHour: Number.isInteger(Number(hour)) ? Number(hour) : 5,
          zone: validZone(input("time-zone")) ?? defaultZone,
        },
      },
    },
  };
}

/** An IANA zone Intl knows, or null: a mistyped one would stop the form from drawing its hours. */
function validZone(zone: string | null): string | null {
  if (!zone) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return null;
  }
}

/** The editor's choice for a `theme` input, as far as it maps onto one. */
function choiceOfTheme(value: string | null): Pick<Setup["choice"], "mode" | "dark" | "light" | "look"> {
  const names = (value ?? "both")
    .split(/[\s,]+/)
    .filter(Boolean)
    .flatMap((n) => (n === "both" ? ["dark", "light"] : [n]));
  const named = names.map((n) => (n === "dark" ? "midnight" : n === "light" ? LIGHT : n));
  const [a, b] = named;
  if (named.length >= 2 && DARK_LOOKS.includes(a)) {
    return { mode: "follow", dark: a, light: b === LIGHT && lightOf(a) !== LIGHT ? "daylight" : "own", look: a };
  }
  if (DARK_LOOKS.includes(a) && lightOf(a) === a) return { mode: "follow", dark: a, light: "own", look: a };
  if (LOOKS.includes(a)) return { mode: "one", dark: "midnight", light: "own", look: a };
  return { mode: "follow", dark: "midnight", light: "own", look: "midnight" };
}

export const DEFAULT_SETUP = (zone: string): Setup => ({
  profile: true,
  repos: [],
  choice: {
    mode: "follow",
    dark: "midnight",
    light: "own",
    look: "midnight",
    calendar: "chart",
    stars: "steps",
    sections: [],
    refresh: { often: "day", utcHour: 5, zone },
  },
});

/** `text` with its one `from` replaced; a missing or doubled anchor is an error, as in the editor. */
function swap(text: string, from: string, to: string): string {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0)
    throw new Error(`glancecard's README has moved: ${JSON.stringify(from.slice(0, 50))}`);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

export const planOf = (setup: Setup): Plan =>
  plan({
    ...setup.choice,
    refresh: { ...setup.choice.refresh, explicit: true },
    sections: setup.choice.sections.length ? setup.choice.sections : undefined,
  });

const pin = (text: string, version: string) =>
  swap(text, `gfazioli/glancecard@${README_VERSION}`, `gfazioli/glancecard@${version}`);

/** The workflow file for a setup, with the viewer's login and repositories and the latest release pinned. */
export function buildWorkflow(setup: Setup, login: string, version: string): string {
  let out = pin(workflow(WORKFLOW, planOf(setup)), version);
  out = swap(out, "          profile: your-login\n", setup.profile ? `          profile: ${login}\n` : "");
  const repos = "\n          repos: |\n            your-login/your-repo\n            your-login/another-repo";
  out = swap(
    out,
    repos,
    setup.repos.length ? `\n          repos: |\n${setup.repos.map((r) => `            ${r}`).join("\n")}` : "",
  );
  return `${out.replace(/^# \.github\/workflows\/glancecard\.yml\n/, "")}\n`;
}

export const dependabotFile = () => `${DEPENDABOT}\n`;

/** The entry alone, for a `dependabot.yml` that already has its `version` and `updates`. */
export const dependabotEntry = () =>
  `${DEPENDABOT.split("\n")
    .slice(DEPENDABOT.split("\n").indexOf("updates:") + 1)
    .join("\n")}\n`;

/** The embed for one card's files, as the README writes it, pointing under `prefix`. */
function embedAt(p: Plan, prefix: string, base: string, alt: string): string {
  return embed(EMBED, p).split("glancecard/your-repo").join(`${prefix}${base}`).replace("your-repo at a glance", alt);
}

/** The profile README's embed: the cards sit beside it, so the paths are relative. */
export const profileEmbed = (p: Plan, login: string, outDir = "glancecard") =>
  embedAt(p, `${outDir}/`, "profile", `${login}'s GitHub activity`);

/** A repository README's embed: the cards live in the profile repository, so the paths are raw URLs. */
export function repositoryEmbed(
  p: Plan,
  full: string,
  base: string,
  home: { login: string; branch: string; outDir?: string },
) {
  const prefix = `https://raw.githubusercontent.com/${home.login}/${home.login}/${home.branch}/${home.outDir ?? "glancecard"}/`;
  return embedAt(p, prefix, base, `${full.split("/")[1]} at a glance`);
}

/** The file name a repository's cards get in a step drawing `repos`: its name, or owner-name when another shares it. */
export const fileBase = (repos: string[], full: string) => fileBases(repos).get(full) ?? full.split("/")[1];

/** The README's one-paste prompt for a coding agent, for the setup. It sets up the profile card always, so it is offered only with it. */
export function buildPrompt(setup: Setup, version: string): string {
  const out = pin(prompt(PROMPT, planOf(setup)), version);
  // The README's line lets the agent pick three repositories; the form already chose, none included.
  return swap(
    out,
    "<owner/name, owner/name — or leave this line as it is, and pick my 3 most-starred public repositories that are not forks>",
    setup.repos.length ? setup.repos.join(", ") : "none: only my profile card",
  );
}

/** GitHub's "new file" page, filled in: the viewer only presses Commit. */
export const newFileUrl = (login: string, branch: string, filename: string, value: string) =>
  `https://github.com/${login}/${login}/new/${encodeURIComponent(branch)}?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(value)}`;

export const editFileUrl = (login: string, branch: string, filename: string) =>
  `https://github.com/${login}/${login}/edit/${encodeURIComponent(branch)}/${filename}`;

export const readmeEditUrl = (full: string, branch: string) =>
  `https://github.com/${full}/edit/${encodeURIComponent(branch)}/README.md`;

export const workflowRunUrl = (login: string, path: string) =>
  `https://github.com/${login}/${login}/actions/workflows/${path.split("/").pop()}`;

/** The default branch of a repository, for its README editor. */
export async function defaultBranch(full: string): Promise<string> {
  return (await gh().rest<{ default_branch: string }>(`/repos/${full}`)).data.default_branch;
}
