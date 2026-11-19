import type { Conversation, InboxParty, NetworkRequest, ThreadMessage } from "./types";

const ACTIONS = {
  meet: ["meet each other", "meet you", "meet"],
  work_with: ["work together", "work with you", "work with"],
} as const;

export const COSIGN_ORIGIN = "https://cosign.co";
export const OPEN_REQUESTS_URL = `${COSIGN_ORIGIN}/signals?view=open`;
export const searchUrl = (query: string) => `${COSIGN_ORIGIN}/search?q=${encodeURIComponent(query)}`;

/** Resolve a server-supplied link against Cosign's origin. Anything that isn't plain https on cosign.co becomes the home page. */
export function absolute(link: string): string {
  try {
    const url = new URL(link, COSIGN_ORIGIN);
    const ours = url.hostname === "cosign.co" || url.hostname.endsWith(".cosign.co");
    return url.protocol === "https:" && ours && !url.username && !url.password ? url.href : COSIGN_ORIGIN;
  } catch {
    return COSIGN_ORIGIN;
  }
}

// CommonMark lets any ASCII punctuation character be backslash-escaped, which leaves the text nothing to form a
// link, list, heading, rule, quote or HTML with. Two exceptions: Raycast renders `\(…\)` and `\[…\]` as LaTeX, so
// brackets become character references instead, and parentheses stay as they are (they mean nothing without `[`).
const escapeSyntax = (text: string) =>
  text.replace(/[!-/:-@[-`{-~]/g, (c) =>
    c === "[" ? "&#91;" : c === "]" ? "&#93;" : c === "(" || c === ")" ? c : `\\${c}`,
  );

export const escapeMd = (text: string) => escapeSyntax(text.replace(/\s+/g, " ").trim());

/**
 * A message is written in Markdown on Cosign, so it renders as Markdown here, inside a block quote so it cannot forge
 * a sender line or a separator. Images are shown as text, so opening a thread never loads a remote picture.
 * Line endings are LF, CR or CRLF, so all three are normalized before splitting.
 */
export const quote = (text: string) =>
  text
    .split(/\r\n|\r|\n/)
    .map((line) => `> ${line.trimEnd().replace(/!\[/g, "!&#91;")}`)
    .join("\n");

/** "/profile/nominee/<id>" -> "<id>"; undefined for any other path (organizations, for instance). */
export const nomineeIdFromPath = (profileUrl: string) => /\/profile\/nominee\/([^/?#]+)/.exec(profileUrl)?.[1];

export const nomineeUrl = (nomineeId: string) => `${COSIGN_ORIGIN}/profile/nominee/${encodeURIComponent(nomineeId)}`;

/** A person's page: on Cosign when they're on it, else their X profile. Never the raw server `profileUrl`. */
export const personUrl = (nomineeId: string | null, handle: string) =>
  nomineeId ? nomineeUrl(nomineeId) : xProfile(handle).url;

/** A company's logo. List entries give companies a `kind=person` image URL, which serves a blank square. */
export const organizationImage = (organizationId: string) =>
  `${COSIGN_ORIGIN}/api/profile-image?kind=organization&id=${encodeURIComponent(organizationId)}&size=128`;

export const xProfile = (handle: string) => {
  const name = handle.replace(/^@/, "");
  return { label: `@${name}`, url: `https://x.com/${encodeURIComponent(name)}` };
};

export const unreadCount = (conversations: Conversation[] = [], requests: NetworkRequest[] = []) =>
  conversations.filter((c) => c.unread).length + requests.filter((r) => !r.closed).length;

/**
 * A request's one-line summary for the menu bar. People write their taglines like LinkedIn headlines, as segments
 * split by " | ", so only the first is kept. Someone with no tagline gets their first current role instead.
 */
export function requestSubtitle({
  tagline,
  experiences,
}: Pick<NetworkRequest, "tagline" | "experiences">): string | undefined {
  const line = tagline?.trim();
  if (line) return line.split(/\s\|(?:\s|$)/)[0].trim();
  const role = experiences.find((e) => /\bPresent$/.test(e.dateRange ?? ""));
  return role ? `${role.title} at ${role.organizationName}` : undefined;
}

export function profilePhoto(imageUrl?: string | null): string | null {
  const url = URL.parse(imageUrl ?? "");
  if (url?.protocol !== "https:") return null;
  url.searchParams.set("raycast-width", "96");
  url.searchParams.set("raycast-height", "96");
  return `![](${url.href.replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
}

const stamp = (ms: number) =>
  new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Oldest message first, each under a bold sender line. System and activity entries are italic and unattributed.
 * The counterpart is matched by principal key, which also covers a company whose messages come from an operator.
 */
export function threadMarkdown(counterpart: InboxParty, messages: ThreadMessage[]): string {
  return [...messages]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((m) => {
      if (m.kind !== "user") return `_${escapeMd(m.body)}_`;
      // Compare principal keys when the message has one; fall back to user ids only when the counterpart has one.
      // Anything else (a company operator's message with no principal key) can't be placed, so it gets no author.
      const theirs = m.senderPrincipalKey
        ? m.senderPrincipalKey === counterpart.principalKey
        : counterpart.userId && m.senderUserId
          ? m.senderUserId === counterpart.userId
          : undefined;
      const who = theirs === undefined ? "_Sender unknown_" : `**${escapeMd(theirs ? counterpart.name : "You")}**`;
      return `${who} · ${stamp(m.createdAt)}\n\n${quote(m.body)}`;
    })
    .join("\n\n---\n\n");
}

const SIGNAL_LABELS: Record<string, string> = {
  have_met: "Have met",
  already_know_each_other: "Already know each other",
  work_with: "Would work with",
  meet: "Would meet",
};

export const signalLabel = (kind: string) =>
  (Object.hasOwn(SIGNAL_LABELS, kind) ? SIGNAL_LABELS[kind] : undefined) ??
  kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const list = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
const KNOWN = ["meet", "work_with"] as const;

export function connectionSentence(c: Conversation): string | null {
  const them = c.signalExchange?.find((e) => e.from.userId === c.counterpart.userId)?.signalKinds;
  const me = c.signalExchange?.find((e) => e.to.userId === c.counterpart.userId)?.signalKinds;
  if (
    !them ||
    !me ||
    [...them, ...me].some((k) => k !== "already_know_each_other" && !(KNOWN as readonly string[]).includes(k))
  ) {
    return c.connectionReason;
  }
  const first = c.counterpart.name.split(" ")[0];
  const both = KNOWN.filter((k) => them.includes(k) && me.includes(k));
  const onlyThem = KNOWN.filter((k) => them.includes(k) && !me.includes(k));
  const onlyMe = KNOWN.filter((k) => me.includes(k) && !them.includes(k));
  const sentences: string[] = [];
  if (them.includes("already_know_each_other") || me.includes("already_know_each_other")) {
    sentences.push("You already know each other.");
  }
  if (both.length) sentences.push(`You both would ${list(both.map((k) => ACTIONS[k][0]))}.`);
  if (onlyThem.length)
    sentences.push(`${first} would ${both.length ? "also " : ""}${list(onlyThem.map((k) => ACTIONS[k][1]))}.`);
  if (onlyMe.length)
    sentences.push(`You would ${both.length ? "also " : ""}${list(onlyMe.map((k) => ACTIONS[k][2]))} ${first}.`);
  return sentences.join(" ") || c.connectionReason;
}

/**
 * Rows that share a name get the person's handle, so two people called "Alex" read as "Alex (@alex)" and
 * "Alex (@alex_smith)". A repeat that still matches (no handle, as on every request row) gets a number: "Alex (2)".
 * Titles come back unique, because Raycast doesn't run the actions of identical sibling menu bar items.
 */
export function withHandles(rows: { name: string; handle?: string | null }[]): string[] {
  const seen = new Map<string, number>();
  for (const { name } of rows) seen.set(name, (seen.get(name) ?? 0) + 1);
  const taken = new Set<string>();
  return rows.map(({ name, handle }) => {
    const base = (seen.get(name) ?? 0) > 1 && handle ? `${name} (@${handle})` : name;
    let title = base;
    for (let n = 2; taken.has(title); n++) title = `${base} (${n})`;
    taken.add(title);
    return title;
  });
}
