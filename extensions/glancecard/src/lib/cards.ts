// A card's data, read from GitHub with glancecard's own fetchers and kept in the support folder,
// and the card drawn from it with glancecard's own renderers, as files Raycast shows by path.
import { environment } from "@raycast/api";
import {
  REPO_SECTIONS,
  fetchProfile,
  fetchRepo,
  loadImages,
  profileModel,
  renderProfile,
  renderRepo,
  repoModel,
  starStore,
  theme,
  type CardData,
  type ProfileModel,
  type RepoModel,
} from "glancecard";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gh, sameLogin, timeZone, viewerLogin } from "./github";

export type Target = { kind: "profile"; login: string } | { kind: "repo"; full: string };

export interface CardOptions {
  calendar: string;
  starsChart: string;
  sections: string[];
}

export const DEFAULT_OPTIONS: CardOptions = { calendar: "chart", starsChart: "steps", sections: REPO_SECTIONS };

/** What a card is drawn from, as kept on disk: glancecard's data, the avatars, and whose it is. */
export interface Card {
  target: Target;
  data: CardData;
  images: Record<string, string>;
  /** The viewer's own profile, or a repository the viewer can push to. */
  mine: boolean;
  viewer: string;
}

/** A card's data is read again after this long; until then it is shown as kept. */
export const STALE_MS = 30 * 60 * 1000;

const dir = (...parts: string[]) => {
  const d = path.join(environment.supportPath, ...parts);
  mkdirSync(d, { recursive: true });
  return d;
};

export const targetName = (t: Target) => (t.kind === "profile" ? t.login : t.full);
export const targetTitle = (t: Target) => (t.kind === "profile" ? `@${t.login}` : t.full);
export const targetUrl = (t: Target) => `https://github.com/${targetName(t)}`;
const targetKey = (t: Target) => `${t.kind}-${targetName(t).toLowerCase().replace("/", "--")}`;
const dataFile = (t: Target) => path.join(dir("data"), `${targetKey(t)}.json`);

function writeAtomic(file: string, text: string) {
  // Every command of every extension shares Raycast's one Node process: the pid alone is no name.
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

/** The card kept from the last read, or null. */
export function keptCard(target: Target): Card | null {
  try {
    return JSON.parse(readFileSync(dataFile(target), "utf8")) as Card;
  } catch {
    return null;
  }
}

export const isStale = (card: Card) => Date.now() - new Date(card.data.fetchedAt).getTime() > STALE_MS;

const reading = new Map<string, Promise<Card>>();
let queue: Promise<unknown> = Promise.resolve();

/**
 * Reads a card from GitHub, keeps it on disk and returns it. A read already under way for the
 * card is joined, not started again (a command remounted after signing in asks twice), and
 * reads run one at a time, since every one of them loads and saves the same star histories.
 */
export function readCard(target: Target): Promise<Card> {
  const key = targetKey(target);
  const running = reading.get(key);
  if (running) return running;
  const read = queue.then(
    () => fetchCard(target),
    () => fetchCard(target),
  );
  queue = read.catch(() => undefined);
  reading.set(key, read);
  void read.finally(() => reading.delete(key)).catch(() => undefined);
  return read;
}

/**
 * One read. The star histories are kept between reads as the Action keeps them, so after the
 * first read of a profile (a request per 30 weeks of each repository's life) a read costs one
 * request per repository.
 */
async function fetchCard(target: Target): Promise<Card> {
  const now = new Date();
  const viewer = await viewerLogin();
  const stars = starStore({ file: path.join(dir(), "stars.json"), now });
  await stars.load();

  let card: Card;
  try {
    card = await readTarget(target, now, viewer, stars);
  } catch (error) {
    throw new Error(plainError(error, target));
  } finally {
    // Kept even when the read fails: a profile with a thousand repositories spends GitHub's hourly
    // allowance before its first read ends, and each try then starts from the histories read before.
    // A cache: a save that loses a race with another command's costs a re-read, not the card.
    await stars.save().catch(() => undefined);
  }
  writeAtomic(dataFile(target), JSON.stringify(card));
  // The drawings of the last read are named by its instant: none of them is shown again.
  rmSync(path.join(environment.supportPath, "cards", targetKey(target)), { recursive: true, force: true });
  prune();
  return card;
}

/** GitHub's errors as a reader can act on them, for the cases glancecard cannot draw. */
function plainError(error: unknown, target: Target): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/\/contributors\b.*HTTP 403/.test(message)) {
    return `GitHub does not list the contributors of a repository as large as ${targetName(target)}, so glancecard cannot draw its card`;
  }
  if (/Could not resolve to a User/.test(message)) {
    return `${targetName(target)} is not a user: glancecard draws the profiles of users, and the repositories of organizations`;
  }
  return message;
}

async function readTarget(
  target: Target,
  now: Date,
  viewer: string,
  stars: ReturnType<typeof starStore>,
): Promise<Card> {
  const client = gh();
  if (target.kind === "profile") {
    const data = await fetchProfile(client, target.login, { now, stars });
    const model = profileModel(data, { now, timeZone: timeZone() });
    const images = await loadImages(client, [model.user.avatarUrl], 160);
    // GitHub's own spelling of the login, whatever was typed.
    return {
      target: { kind: "profile", login: model.user.login },
      data,
      images,
      mine: sameLogin(model.user.login, viewer),
      viewer,
    };
  }
  const [data, permission] = await Promise.all([
    fetchRepo(client, target.full, { now, timeZone: timeZone(), stars }),
    viewerPermission(target.full),
  ]);
  const model = repoModel(data, { now, timeZone: timeZone() });
  const images = await loadImages(
    client,
    model.contributors.map((c) => c.avatarUrl),
    56,
  );
  return { target: { kind: "repo", full: model.repo.nameWithOwner }, data, images, mine: permission, viewer };
}

const DAY = 24 * 3600 * 1000;

/**
 * What no view will show again: the drawings of cards not read for a week, the copies made for
 * the clipboard after a day, the data of cards not read for a month.
 */
function prune() {
  const now = Date.now();
  for (const [folder, age] of [
    ["cards", 7 * DAY],
    ["export", DAY],
    ["data", 30 * DAY],
  ] as const) {
    const root = path.join(environment.supportPath, folder);
    for (const name of existsSync(root) ? readdirSync(root) : []) {
      const entry = path.join(root, name);
      if (now - statSync(entry).mtimeMs > age) rmSync(entry, { recursive: true, force: true });
    }
  }
}

/** Whether the viewer can push to a repository, and so put its card in its README. */
async function viewerPermission(full: string): Promise<boolean> {
  const [owner, name] = full.split("/");
  const data = await gh().graphql<{ repository: { viewerPermission: string | null } | null }>(
    "query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { viewerPermission } }",
    { owner, name },
  );
  return ["ADMIN", "MAINTAIN", "WRITE"].includes(data.repository?.viewerPermission ?? "");
}

export function profileOf(card: Card): ProfileModel {
  return profileModel(card.data, { timeZone: timeZone() });
}

export function repoOf(card: Card): RepoModel {
  return repoModel(card.data, { timeZone: timeZone() });
}

/** The sections a repository's thumbnail shows: enough to tell a look, short enough to read in a Grid. */
const THUMB_SECTIONS = ["hero", "tiles"];

/** The card as SVG text, in a look, with the options; a thumbnail is a repository card's top only. */
export function renderCard(card: Card, look: string, options: CardOptions, thumb = false): string {
  const t = theme(look);
  const common = { theme: t, images: card.images, calendar: options.calendar, starsChart: options.starsChart };
  // `stars: true` as the Action passes it whenever it reads the histories; a missing history draws no panel.
  if (card.target.kind === "profile") return renderProfile(profileOf(card), { ...common, stars: true });
  const sections = thumb ? THUMB_SECTIONS : options.sections.length ? options.sections : REPO_SECTIONS;
  return renderRepo(repoOf(card), { ...common, sections });
}

/**
 * The card drawn to a file and its path. A file is named by what it shows (the data's
 * instant, the look, the options), so a drawing is made once and a new read draws anew.
 */
export function cardFile(card: Card, look: string, options: CardOptions, thumb = false): string {
  const hash = createHash("sha1")
    .update(JSON.stringify([card.data.fetchedAt, look, options, thumb]))
    .digest("hex")
    .slice(0, 12);
  const file = path.join(dir("cards", targetKey(card.target)), `${look}${thumb ? "-thumb" : ""}-${hash}.svg`);
  if (!existsSync(file)) writeAtomic(file, renderCard(card, look, options, thumb));
  return file;
}

/** The name a card is saved and copied under: what the Action would call it, with its look. */
export function exportName(card: Card, look: string): string {
  const base = card.target.kind === "profile" ? `profile-${card.target.login}` : card.target.full.split("/")[1];
  return `${base}-${look}.svg`;
}

/** The card as a file with its export name, in the support folder, for the clipboard. */
export function exportFile(card: Card, look: string, options: CardOptions): string {
  const file = path.join(dir("export"), exportName(card, look));
  writeFileSync(file, readFileSync(cardFile(card, look, options), "utf8"));
  return file;
}
