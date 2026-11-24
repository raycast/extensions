import { execFileSync } from "node:child_process";
import { homedir, userInfo } from "node:os";
import path from "node:path";
import { LocalStorage } from "@raycast/api";

export function getUserShell(): string {
  return process.env.SHELL || userInfo().shell || "/bin/sh";
}

export function expandPath(p: string): string {
  return p.startsWith("~") ? path.join(homedir(), p.slice(1)) : p;
}

export function isPathLikeFolder(folderArg: string): boolean {
  return folderArg.startsWith("~") || folderArg.startsWith("/");
}

export function findJustfiles(folders: string[]): string[] {
  const files: string[] = [];
  for (const folder of folders) {
    try {
      const result = execFileSync(
        "find",
        [
          "-L",
          folder,
          "-maxdepth",
          "1",
          "(",
          "-name",
          "justfile",
          "-o",
          "-name",
          "Justfile",
          ")",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      files.push(...result.trim().split("\n").filter(Boolean));
    } catch {
      // path doesn't exist or find failed, skip
    }
  }
  return files;
}

export interface JustParam {
  name: string;
  defaultValue: string | null;
  kind: "singular" | "plus" | "star";
}

export interface JustRecipe {
  name: string;
  doc: string;
  filePath: string;
  folderName: string;
  params: JustParam[];
  isPrivate: boolean;
  isConfirm: boolean;
  isSilent: boolean;
  body: string;
  dependencies: string[];
  group: string | null;
}

type BodyToken = string | Array<[string, string]>;
type Attribute = string | Record<string, unknown>;

interface RawParam {
  name: string;
  default: string | null;
  kind: "singular" | "plus" | "star";
}

interface RawDependency {
  recipe: string;
  arguments: unknown[];
}

interface RawRecipe {
  name: string;
  doc: string | null;
  parameters: RawParam[];
  private: boolean;
  quiet?: boolean;
  attributes: Attribute[];
  body: BodyToken[][];
  dependencies: RawDependency[];
}

function rawBodyToText(body: BodyToken[][]): string {
  return body
    .map(
      (line) =>
        "    " +
        line
          .map((tok) => {
            if (typeof tok === "string") return tok;
            return tok
              .map((pair) => (pair[0] === "variable" ? `{{${pair[1]}}}` : ""))
              .join("");
          })
          .join(""),
    )
    .join("\n");
}

// Prepend Homebrew paths so both view and no-view commands find `just`
// regardless of how Raycast was launched.
const EXEC_ENV = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
};

export function ensureJustInstalled(): void {
  try {
    execFileSync("just", ["--version"], {
      encoding: "utf8",
      env: EXEC_ENV,
      stdio: "ignore",
    });
  } catch {
    throw new Error(
      "just is not installed. Install it with `brew install just`.",
    );
  }
}

// json dump keys recipes by a BTreeMap (always alphabetical), so scrape the
// plain `just --dump` output for declaration order instead.
function getDeclarationOrder(justfilePath: string): string[] {
  const dump = execFileSync("just", ["--dump", "--justfile", justfilePath], {
    encoding: "utf8",
    env: EXEC_ENV,
  });
  const order: string[] = [];
  for (const rawLine of dump.split("\n")) {
    if (/^\s/.test(rawLine)) continue; // recipe body or continuation
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("[")) continue;
    if (line.includes(":=")) continue; // variable assignment or alias
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*).*:/);
    if (m) order.push(m[1]);
  }
  return order;
}

export function parseRecipes(justfilePath: string): JustRecipe[] {
  try {
    const jsonOutput = execFileSync(
      "just",
      ["--dump", "--dump-format", "json", "--justfile", justfilePath],
      {
        encoding: "utf8",
        env: EXEC_ENV,
      },
    );
    const data = JSON.parse(jsonOutput) as {
      recipes: Record<string, RawRecipe>;
    };
    const folderName = path.basename(path.dirname(justfilePath));
    const order = getDeclarationOrder(justfilePath);
    const orderedRawRecipes = [
      ...order.map((name) => data.recipes[name]).filter(Boolean),
      ...Object.values(data.recipes).filter((r) => !order.includes(r.name)),
    ];

    return orderedRawRecipes.map((r) => {
      const isConfirm = r.attributes.some(
        (a) => typeof a === "object" && a !== null && "confirm" in a,
      );
      const isSilent =
        r.quiet === true ||
        r.attributes.some(
          (a) => typeof a === "object" && a !== null && "silent" in a,
        );
      const groupAttr = r.attributes.find(
        (a) => typeof a === "object" && a !== null && "group" in a,
      ) as Record<string, string> | undefined;

      return {
        name: r.name,
        doc: r.doc ?? "",
        filePath: justfilePath,
        folderName,
        params: r.parameters.map((p) => ({
          name: p.name,
          defaultValue: p.default,
          kind: p.kind,
        })),
        isPrivate: r.private,
        isConfirm,
        isSilent,
        body: rawBodyToText(r.body),
        dependencies: r.dependencies.map((d) => d.recipe),
        group: groupAttr ? groupAttr["group"] : null,
      };
    });
  } catch (e) {
    throw new Error(`parseRecipes(${justfilePath}): ${String(e)}`);
  }
}

function normalizePath(p: string): string {
  return path.resolve(p).replace(/\/$/, "");
}

async function getStoredPaths(key: string): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(key);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

// Picker-added folders, separate from the justfileFolders preference. Merged
// with it minus explicit removals, so Run Recipe sees what the view sees.
export async function getAllJustfileFolders(
  justfileFoldersPref: string,
): Promise<string[]> {
  const prefPaths = (justfileFoldersPref || "")
    .split(",")
    .map((p) => expandPath(p.trim()))
    .filter(Boolean);
  const pickedPaths = await getStoredPaths("pickedJustfileFolders");
  const excludedPaths = await getStoredPaths("excludedJustfileFolders");
  const excludedSet = new Set(excludedPaths.map(normalizePath));
  const merged = Array.from(
    new Set([...prefPaths, ...pickedPaths].map(normalizePath)),
  );
  return merged.filter((p) => !excludedSet.has(p));
}

// Unlike getAllJustfileFolders, doesn't subtract excludedJustfileFolders, so
// a previously-excluded folder can be toggled back on without rediscovery.
export async function getKnownJustfileFolders(
  justfileFoldersPref: string,
): Promise<string[]> {
  const prefPaths = (justfileFoldersPref || "")
    .split(",")
    .map((p) => expandPath(p.trim()))
    .filter(Boolean);
  const pickedPaths = await getStoredPaths("pickedJustfileFolders");
  const excludedPaths = await getStoredPaths("excludedJustfileFolders");
  return Array.from(
    new Set(
      [...prefPaths, ...pickedPaths, ...excludedPaths].map(normalizePath),
    ),
  ).sort();
}

// "Restore defaults" counterpart to updateJustfileFolders: un-excludes
// folders still in the preference, leaves other exclusions untouched.
export async function restoreJustfileFoldersPreference(
  justfileFoldersPref: string,
): Promise<string[]> {
  const prefPaths = (justfileFoldersPref || "")
    .split(",")
    .map((p) => expandPath(p.trim()))
    .filter(Boolean)
    .map(normalizePath);
  const prefSet = new Set(prefPaths);
  const excluded = await getStoredPaths("excludedJustfileFolders");
  const nextExcluded = excluded.filter((p) => !prefSet.has(normalizePath(p)));
  await LocalStorage.setItem(
    "excludedJustfileFolders",
    JSON.stringify(nextExcluded),
  );
  return getAllJustfileFolders(justfileFoldersPref);
}

// Reconciles the picker list against the effective list: new folders join pickedJustfileFolders, dropped ones move
// to excludedJustfileFolders. This is how a preference folder gets "removed" without an API to edit the preference.
export async function updateJustfileFolders(
  justfileFoldersPref: string,
  newPaths: string[],
): Promise<string[]> {
  const oldEffective = await getAllJustfileFolders(justfileFoldersPref);
  const submitted = Array.from(new Set(newPaths.map(normalizePath)));
  const oldSet = new Set(oldEffective);
  const newSet = new Set(submitted);
  const removed = oldEffective.filter((p) => !newSet.has(p));
  const added = submitted.filter((p) => !oldSet.has(p));
  const removedSet = new Set(removed);
  const addedSet = new Set(added);

  const picked = await getStoredPaths("pickedJustfileFolders");
  const excluded = await getStoredPaths("excludedJustfileFolders");

  const nextPicked = Array.from(
    new Set([...picked.filter((p) => !removedSet.has(p)), ...added]),
  );
  const nextExcluded = Array.from(
    new Set([...excluded.filter((p) => !addedSet.has(p)), ...removed]),
  );

  await LocalStorage.setItem(
    "pickedJustfileFolders",
    JSON.stringify(nextPicked),
  );
  await LocalStorage.setItem(
    "excludedJustfileFolders",
    JSON.stringify(nextExcluded),
  );

  return submitted;
}

export function loadRecipesFromFolders(
  folders: string[],
  onError?: (jf: string, e: unknown) => void,
): JustRecipe[] {
  const justfiles = findJustfiles(folders);
  const all: JustRecipe[] = [];
  for (const jf of justfiles) {
    try {
      all.push(...parseRecipes(jf));
    } catch (e) {
      onError?.(jf, e);
    }
  }
  return all;
}

export async function loadRecipes(
  justfileFoldersPref: string,
  onError?: (jf: string, e: unknown) => void,
): Promise<JustRecipe[]> {
  const paths = await getAllJustfileFolders(justfileFoldersPref);
  return loadRecipesFromFolders(paths, onError);
}

export function matchRecipes(
  recipes: JustRecipe[],
  folderArg: string,
  recipeArg: string,
): JustRecipe[] {
  const tokens = [folderArg, recipeArg]
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return recipes.filter((r) =>
    tokens.every(
      (token) =>
        r.name.toLowerCase().includes(token) ||
        r.folderName.toLowerCase().includes(token),
    ),
  );
}

// Double quotes don't stop shell command substitution (`$(...)`, backticks),
// so wrap in single quotes instead; escape embedded single quotes as '\''.
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function buildRecipeCmd(recipe: JustRecipe, args: string[]): string {
  const quotedArgs = args.map(shellQuote).join(" ");
  return `cd ${shellQuote(path.dirname(recipe.filePath))} && just --yes --justfile ${shellQuote(recipe.filePath)} ${shellQuote(recipe.name)}${quotedArgs ? " " + quotedArgs : ""}`;
}
