// What a profile is, where it lives, and how to build one honestly.
// Plain Node, no Raycast imports: testable outside the app.

import { access, mkdir, readdir, readFile, realpath, writeFile } from "fs/promises";
import { homedir } from "os";
import { basename, join } from "path";
import { execFileAsync, type ListeningPort } from "./system";

// This file deliberately lives outside Raycast's territory. LocalStorage and
// environment.supportPath are both Raycast-managed (folders keyed by UUID,
// ignored by its config export): neither reliably survives an uninstall. Here,
// profiles survive uninstall, reinstall, and a Beta -> stable move.
//
// ~/.config is the convention for this kind of file: not synced by iCloud
// (unlike Documents), and versionable in dotfiles.
// Note: you never need to open it — the Form remains the interface.
export const PROFILES_DIR = join(homedir(), ".config", "port-watcher");
export const PROFILES_FILE = join(PROFILES_DIR, "profiles.json");

export interface Profile {
  // Stable identity, independent of the folder: without it, moving a project
  // would amount to creating a different profile.
  id: string;
  // The folder to run in. One field, because the path IS the label now.
  //
  // This absorbed two earlier attempts at the same problem. A `name` field
  // existed to give the list something readable; a `root` + `directory` split
  // existed to make that name derivable, root answering "where does the project
  // start" — a question a path genuinely cannot answer. Both were machinery
  // built because "site" is a useless label. Showing the whole path answers it
  // outright, and where a project starts stops mattering the moment we no longer
  // need to name it.
  cwd: string;
  // One command, not a run/build pair. There is only ever one action — Launch —
  // and it always ran `build && run`, so the two fields collapsed into one
  // string anyway. A separate build field granted no power you don't have by
  // typing `npm run build && npm run dev` here yourself, and it cost a rule that
  // turns out to be undecidable: Next's `start` needs a build, CRA's `start`
  // refuses one. Same name, opposite needs.
  run: string;
  port?: number; // optional: only breaks ties between two profiles in one folder
}

// Two dead schemas to absorb: the original single `cwd`, and the short-lived
// root + directory split. Both only ever described the same thing — the folder
// to run in — so both collapse back into it. `name` is dropped outright, and
// nothing is lost: the path is the label now.
// root wins when present: it is the newer shape, and the only source for a
// profile saved during that spell.
// Exported for the tests: absorbing dead schemas correctly is exactly the kind
// of logic that silently rots without fixtures pinning it down.
export function migrate(raw: Partial<Profile> & { root?: string; directory?: string }): Profile {
  const cwd = raw.root ? (raw.directory ? join(raw.root, raw.directory) : raw.root) : (raw.cwd ?? "");
  return { id: raw.id ?? "", cwd, run: raw.run ?? "", ...(raw.port ? { port: raw.port } : {}) };
}

// The label. Shortened at home because that prefix sits on every path and says
// nothing: `~/Projects/cv-machine/v00/site` is scannable, the full form is not.
export function displayPath(cwd: string): string {
  const home = homedir();
  if (cwd === home) return "~";
  return cwd.startsWith(home + "/") ? `~${cwd.slice(home.length)}` : cwd;
}

// The physical path, symlinks resolved. Everything downstream compares the
// profile's folder against the cwd lsof reports — and lsof always reports the
// PHYSICAL path. A profile declared through a symlink (/tmp is one, to
// /private/tmp, on every macOS) would never match its own running server: the
// exact-match rule stayed sound, but the two sides were spelling the same
// folder differently. Resolving here, at the single entry point, keeps every
// comparison exact AND true. Unresolvable (folder deleted): keep the raw path
// — it still identifies the profile, and spawn will say why it fails.
export async function canonicalCwd(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    return path;
  }
}

// The file's contents, turned into profiles. Pure — hand it a string, it hands
// back profiles or throws — which is what makes it testable: PROFILES_FILE is a
// fixed path resolved at import, so nothing could point readProfiles at a
// fixture without mocks. Same shape as the other parsers here, and pinned like
// them.
//
// EVERY unreadable file throws. A failing JSON.parse must propagate, never be
// swallowed into []: otherwise one stray comma makes every profile vanish
// silently and you believe they are lost. That reasoning was already written
// down — and then the very next line returned [] for a file that parsed but held
// something other than a profile list. Same disaster, opposite treatment: a
// stray comma got a red row naming the file, a mistyped key got a shrug and an
// empty list. The caller shows the error and the path; it can only do that if we
// raise one.
export function parseProfilesFile(raw: string): Profile[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.profiles)) {
    throw new Error('Expected an object with a "profiles" array, and this file has none.');
  }
  return parsed.profiles.map((entry: Parameters<typeof migrate>[0]) => {
    const profile = migrate(entry);
    // The id becomes a filename: logFileFor joins it into LOGS_DIR, so a crafted
    // "../../x" would make us open, append to, and (past 1 MB) truncate a .log
    // outside the logs folder. The form only ever writes a randomUUID; anything
    // else is a broken file, refused here like a broken shape is — same stance,
    // two lines up. And "only the user writes this file" is not "only this
    // machine's form wrote it": it is meant to be dotfile-syncable, so it can
    // arrive from a repo the user did not author line by line.
    if (!/^[A-Za-z0-9_-]+$/.test(profile.id)) {
      throw new Error(`Profile id ${JSON.stringify(profile.id)} is not a plain identifier.`);
    }
    return profile;
  });
}

export async function readProfiles(): Promise<Profile[]> {
  let raw: string;
  try {
    raw = await readFile(PROFILES_FILE, "utf8");
  } catch (err) {
    // ENOENT means "no such file": first run, not a failure, so return an empty
    // list. Any other error (permissions, disk) does propagate.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  return Promise.all(
    parseProfilesFile(raw).map(async (profile) => ({ ...profile, cwd: await canonicalCwd(profile.cwd) })),
  );
}

export async function writeProfiles(profiles: Profile[]): Promise<void> {
  // recursive:true creates ~/.config/port-watcher when needed and stays quiet if
  // it already exists.
  await mkdir(PROFILES_DIR, { recursive: true });
  // Indented: the file is not meant to be read by hand, but if it ever is, it
  // may as well be readable. The version field spares us guessing the format if
  // the schema changes later — it already earned that twice.
  await writeFile(PROFILES_FILE, JSON.stringify({ version: 1, profiles }, null, 2), "utf8");
}

/* ─── Guard rail: does the chosen folder match the run command? ─── */

// We cannot guess what an arbitrary command needs (a Python script, a Makefile).
// But these runners all require a package.json in the current directory — the
// common case, and the only one we claim to check.
const NODE_RUNNERS = ["npm", "pnpm", "yarn", "bun", "npx"];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Looks for a package.json in DIRECT subfolders only: bounded (no recursive walk
// that would crawl a large tree) and it covers the usual repo/site, repo/app,
// repo/packages layouts.
async function findPackageJsonNearby(folder: string): Promise<string | undefined> {
  try {
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
      if (await exists(join(folder, entry.name, "package.json"))) return entry.name;
    }
  } catch {
    // Unreadable folder: no suggestion. A guard rail that crashes would be worse
    // than no guard rail at all.
  }
  return undefined;
}

// Which command actually runs, once the environment prefix is stepped over.
//
// A run line may open with assignments — `PORT=3000 npm run dev` is a shape
// launch.ts blesses by name in its own header. Reading the first word blind saw
// `PORT=3000`, found it in no runner list, and returned "nothing to check": the
// guard rail went quiet on exactly the commands a guard rail is for, and said so
// to no one. Undefined when nothing but assignments is left — the honest answer,
// not a failure.
export function runnerOf(run: string): string | undefined {
  const isAssignment = (token: string) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);
  return run
    .trim()
    .split(/\s+/)
    .find((token) => token !== "" && !isAssignment(token));
}

// Returns a warning to display, or undefined when all is well.
// Deliberately NON blocking: we report what we see, we don't decide for the user.
export async function checkProjectFolder(folder: string, run: string): Promise<string | undefined> {
  const runner = runnerOf(run);
  if (!runner || !NODE_RUNNERS.includes(runner)) return undefined; // not a runner we can check

  if (await exists(join(folder, "package.json"))) return undefined;

  const suggestion = await findPackageJsonNearby(folder);
  return suggestion
    ? `No package.json here, but there is one in “${suggestion}”. That is probably the folder to pick — otherwise “${runner}” will fail.`
    : `No package.json in this folder: “${runner}” will most likely fail here.`;
}

/* ─── Suggesting a run command from what the folder actually contains ─── */

interface Candidate {
  command: string;
  // Set only when NO evidence picks between interchangeable options, in which
  // case whether the binary exists is how we choose. Evidence-backed commands
  // leave this undefined: if a lockfile says yarn, `yarn run dev` is the answer
  // whether or not yarn is installed here — no other command is correct, and a
  // missing yarn is something you will see for yourself, instantly, in the log.
  binary?: string;
}

// Does this executable actually exist on THIS machine?
//
// Checked through the login shell, not our own PATH, and that detail is the
// whole point: launch.ts runs your command through `$SHELL -l -c`, so the only
// PATH that matters is the one a login shell sees. Checking with Node's PATH
// would validate against an environment the command never runs in — we would
// approve things that then fail, and reject things that would have worked.
//
// Cached: the answer cannot change while the form is open, and a login shell
// costs ~100ms to start.
const availabilityCache = new Map<string, boolean>();

async function isAvailable(binary: string): Promise<boolean> {
  const cached = availabilityCache.get(binary);
  if (cached !== undefined) return cached;

  const shell = process.env.SHELL || "/bin/zsh";
  let found = false;
  try {
    // `command -v` is the portable "where is this" builtin. Exit code 0 = found.
    await execFileAsync(shell, ["-l", "-c", `command -v ${binary}`]);
    found = true;
  } catch {
    found = false;
  }
  availabilityCache.set(binary, found);
  return found;
}

// Which package manager, read from the lockfile rather than assumed. Suggesting
// `npm run dev` to a pnpm user is a guess dressed up as help — and a needless
// one, since the lockfile names the tool outright.
// Exported: guessRunCommand relies on it too, and the tests exercise it directly.
export async function detectPackageManager(folder: string): Promise<string> {
  const lockfiles: [string, string][] = [
    ["bun.lock", "bun"], // text lockfile, default since Bun 1.2
    ["bun.lockb", "bun"], // binary lockfile of earlier Bun versions
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ];
  for (const [file, pm] of lockfiles) {
    if (await exists(join(folder, file))) return pm;
  }
  // No lockfile at all: npm ships with node, so it is the least presumptuous
  // fallback rather than a real detection.
  return "npm";
}

async function readJson(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

// Ordered list of candidates, most specific evidence first. Every entry must be
// grounded in a file that is actually on disk — this is a reading exercise, not
// a guessing one. A folder we do not recognize gets no suggestion at all, which
// is the honest outcome, not a failure.
//
// NO SUGGESTION EVER NAMES A PORT
//
// Where a server lets us say "any free port" we say it — `0` — and the kernel
// picks. That is not a nicety: this list used to hand `8000` to every static
// site on the machine, so two static profiles collided by construction, and the
// second one died on "Address already in use" through no fault of yours. It was
// also the only port hardcoded in a module whose whole rule is to read rather
// than assume — a guess wearing the costume of a default.
//
// The port we do not choose is the port that cannot be taken. And nothing
// downstream needs it: the live port is read from the system (that is the entire
// premise of this extension), so the row shows it, Open in Browser goes there,
// and watchLaunch recognizes the launch by its folder. The one cost is that the
// URL changes between launches — which is only a cost if you were typing it,
// and you are not: you click it.
//
// Exported for the tests: this table is the product's opinion about how to start
// things, and it earned coverage the day the hardcoded 8000 shipped.
export async function collectCandidates(folder: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const has = (f: string) => exists(join(folder, f));

  // 1. A JS project. Checked first because vite/next folders also contain an
  //    index.html, and the framework is the better answer for them.
  const pkg = await readJson(join(folder, "package.json"));
  if (pkg) {
    const scripts = (pkg.scripts ?? {}) as Record<string, string>;
    const script = typeof scripts.dev === "string" ? "dev" : typeof scripts.start === "string" ? "start" : undefined;
    if (script) out.push({ command: `${await detectPackageManager(folder)} run ${script}` });
    // A package.json with no dev/start script tells us nothing usable, so we
    // fall through rather than invent one.
  }

  // 2. Language/framework projects, each identified by a file only that
  //    ecosystem produces.
  if (await has("manage.py")) out.push({ command: "python3 manage.py runserver" }); // Django
  if (await has("Cargo.toml")) out.push({ command: "cargo run" });
  if (await has("go.mod")) out.push({ command: "go run ." });
  if ((await has("composer.json")) || (await has("index.php"))) out.push({ command: "php -S 127.0.0.1:0" });
  if ((await has("docker-compose.yml")) || (await has("compose.yaml"))) out.push({ command: "docker compose up" });

  // 3. A Makefile with a dev target: the author wrote down how to start it.
  try {
    const makefile = await readFile(join(folder, "Makefile"), "utf8");
    const target = /^(dev|serve|run|start):/m.exec(makefile)?.[1];
    if (target) out.push({ command: `make ${target}` });
  } catch {
    /* no Makefile */
  }

  // 4. A plain static site — LAST, because it is the fallback for "no framework
  //    claimed this folder". It has no launch command of its own: nothing to
  //    run, only files waiting to be served.
  //
  //    This is the ONE place candidates carry a binary: any of these servers
  //    would do, and nothing on disk prefers one, so what exists decides.
  //
  //    The explicit loopback address is not decoration: these servers bind every
  //    interface by default, which would put your work on the café wifi. Every
  //    modern dev server is localhost-only; we match that rather than surprise
  //    you. `serve` was the exception that proved it — it alone carried no host,
  //    so it bound `*` and the extension flagged our own suggestion with its LAN
  //    tag. Its host goes in the listen URL, hence the tcp:// form.
  //
  //    No `--yes` on the npx line: it would download and run `serve` from the
  //    registry with no prompt, and we do not suggest a command that reaches out
  //    to the network on its own. Without it, a first launch when `serve` is not
  //    installed simply fails and says so in the log — an honest miss, not a
  //    silent fetch. python3 is almost always the pick on macOS anyway.
  if (await has("index.html")) {
    out.push({ command: "python3 -m http.server 0 --bind 127.0.0.1", binary: "python3" });
    out.push({ command: "npx serve --listen tcp://127.0.0.1:0", binary: "npx" });
    out.push({ command: "ruby -run -e httpd . -p 0 --bind-address 127.0.0.1", binary: "ruby" });
    out.push({ command: "php -S 127.0.0.1:0", binary: "php" });
  }

  return out;
}

// A folder tells you what it is, if you look. This exists because a static site
// has no launch command of its own, so the required Run field was a question
// with no obvious answer — while the evidence sat on disk the whole time.
//
// It fills an empty field and says nothing about it. No explanation, no
// justification: this is a dev tool, the command is right there in plain sight,
// and anyone who can read `yarn run dev` can judge it faster than they could
// read a paragraph about it. Undefined when nothing on disk answers the
// question — better an empty field than a confident wrong one.
export async function suggestRunCommand(folder: string): Promise<string | undefined> {
  for (const candidate of await collectCandidates(folder)) {
    if (!candidate.binary || (await isAvailable(candidate.binary))) return candidate.command;
  }
  return undefined;
}

/* ─── What a project is built with ─── */

// A meta-framework owns the dev server and subsumes everything under it: saying
// "React" next to "Next.js" is noise, because Next IS React. So a hit here is
// the whole answer.
const META_FRAMEWORKS: [string, string][] = [
  ["next", "Next.js"],
  ["nuxt", "Nuxt"],
  ["astro", "Astro"],
  ["@sveltejs/kit", "SvelteKit"],
  ["@remix-run/react", "Remix"],
  ["gatsby", "Gatsby"],
  ["@angular/core", "Angular"],
];

// What the code is written in.
const UI_LIBRARIES: [string, string][] = [
  ["react", "React"],
  ["vue", "Vue"],
  ["svelte", "Svelte"],
  ["solid-js", "Solid"],
  ["preact", "Preact"],
];

// What serves it, when no meta-framework does.
const BUILD_TOOLS: [string, string][] = [
  ["vite", "Vite"],
  ["webpack", "Webpack"],
  ["parcel", "Parcel"],
  ["@rspack/core", "Rspack"],
];

// Read, never inferred: a dependency is a declaration. We report what the
// manifest says and nothing more — an unrecognized project gets an empty list
// and therefore no badge at all, rather than a confident wrong label.
export async function detectStack(cwd: string): Promise<string[]> {
  const pkg = await readJson(join(cwd, "package.json"));

  if (pkg) {
    // Both maps merged: a tool being a devDependency rather than a dependency is
    // a packaging detail, not a fact about what this project is.
    const deps = { ...((pkg.dependencies as object) ?? {}), ...((pkg.devDependencies as object) ?? {}) };
    const has = (name: string) => name in deps;

    const meta = META_FRAMEWORKS.find(([dep]) => has(dep));
    if (meta) return [meta[1]];

    const found = [...UI_LIBRARIES, ...BUILD_TOOLS].filter(([dep]) => has(dep)).map(([, label]) => label);
    return found;
  }

  // Non-JS ecosystems, each named by a file only that ecosystem produces.
  if (await exists(join(cwd, "manage.py"))) return ["Django"];
  if (await exists(join(cwd, "Cargo.toml"))) return ["Rust"];
  if (await exists(join(cwd, "go.mod"))) return ["Go"];
  if (await exists(join(cwd, "composer.json"))) return ["PHP"];

  // No manifest at all but a page to serve: that IS the answer, not a gap.
  if (await exists(join(cwd, "index.html"))) return ["Static site"];

  return [];
}

/* ─── Drafting a profile from a running process ─── */

// The running command line is what npm RESOLVED to, not what you typed:
//   node /Users/…/node_modules/.bin/vite
// Storing that verbatim would be wrong — an absolute path into node_modules,
// broken by the next install, and stripped of everything npm sets up around a
// script (PATH, env, pre/post hooks). So we walk BACKWARDS from the resolved
// binary to the npm script that would produce it, and offer that as a guess.
// A guess, never a silent save: the form is where you confirm it.
export async function guessRunCommand(cwd: string, fullCommand?: string): Promise<string | undefined> {
  if (!fullCommand) return undefined;

  try {
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));
    const scripts: Record<string, string> = pkg?.scripts ?? {};

    const binaryPath = fullCommand.split(/\s+/).find((token) => token.includes("node_modules/.bin/"));
    if (!binaryPath) return undefined;
    const binary = basename(binaryPath);

    // The script runs through whatever package manager the lockfile names —
    // same rule as suggestRunCommand. Suggesting `npm run dev` in a pnpm
    // project would be exactly the assumption detectPackageManager exists
    // to avoid.
    const pm = await detectPackageManager(cwd);

    // Exact value first: "dev": "vite" must beat "build": "vite build" when the
    // running binary is plain "vite". Both start with the same word, so a
    // first-token match alone would happily suggest `npm run build` for a dev
    // server. Only fall back to the loose match if nothing matched exactly.
    for (const [name, value] of Object.entries(scripts)) {
      if (value.trim() === binary) return `${pm} run ${name}`;
    }
    for (const [name, value] of Object.entries(scripts)) {
      if (value.trim().split(/\s+/)[0] === binary) return `${pm} run ${name}`;
    }
  } catch {
    // No package.json, or unreadable: no guess. An empty Run field is honest;
    // a wrong one is not.
  }
  return undefined;
}

// Builds the prefilled draft. cwd is READ from the system, so it cannot be
// mistyped — this path structurally cannot produce the wrong-folder mistake the
// guard rail exists to catch. Only `run` is a guess, inferred from a real clue
// (the resolved binary), which is why the form opens for you to check it rather
// than saving straight away.
//
// The port is prefilled ONLY when another profile already claims this folder.
// A declared port has exactly one job — telling apart two profiles that share a
// folder — and that is the one situation where it is needed. For a first
// capture, freezing tonight's live port into the profile would assert something
// we do not know ("this command will pick 5174 again"), and a prefilled field
// reads as a recommendation.
//
// We deliberately do NOT prepend a build step here. An earlier version suggested
// `npm run build && …` whenever a build script existed, which is worse than
// useless for a dev server: `vite` serves your source transformed in memory and
// never opens dist/, so the build would burn time producing files nobody reads.
// And we cannot tell the difference from here — so we say nothing.
export async function draftProfileFromPort(port: ListeningPort, existing: Profile[]): Promise<Partial<Profile>> {
  const cwd = port.cwd!;
  // We used to ask git for the project root here, because a captured profile
  // needed a name and `basename(cwd)` gave "site" for everything. With the path
  // as the label there is no name to derive, so there is nothing to ask git —
  // the folder lsof reports is the whole answer.
  const hasSibling = existing.some((p) => p.cwd === cwd);
  return {
    cwd,
    run: (await guessRunCommand(cwd, port.fullCommand)) ?? "",
    ...(hasSibling ? { port: Number(port.port) } : {}),
  };
}
