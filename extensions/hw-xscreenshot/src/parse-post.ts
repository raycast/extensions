import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";

export interface Run {
  text: string;
  link: boolean;
}

export interface Media {
  url: string;
  video: boolean;
}

export interface Post {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  verified: boolean;
  runs: Run[];
  media: Media[];
  quote?: Post;
  when: string;
  views: string;
  stats: { count: string; label: string }[];
}

export interface Thread {
  parents: Post[];
  focal: Post;
}

const MAX_PARENTS = 4;
const MAX_MEDIA = 4;
const MEDIA_URL =
  /^https:\/\/pbs\.twimg\.com\/(media|card_img|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\//;
const PROFILE_URL = /^https:\/\/pbs\.twimg\.com\/profile_images\//;
const STATS: Record<string, string> = {
  reply: "Replies",
  retweet: "Reposts",
  like: "Likes",
  unlike: "Likes",
  bookmark: "Bookmarks",
  removeBookmark: "Bookmarks",
};

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function ancestors(node: HTMLElement, stop: HTMLElement): HTMLElement[] {
  const list: HTMLElement[] = [];
  for (let p = node.parentNode as HTMLElement | null; p && p !== stop; p = p.parentNode as HTMLElement | null)
    list.push(p);
  return list;
}

function imgSrc(img: HTMLElement): string {
  const src = img.getAttribute("src") ?? "";
  return src.startsWith("https:") ? src : (img.getAttribute("srcset") ?? "").split(/\s+/)[0];
}

// A quoted post is a nested <article> (new markup) or a role=link block that
// holds its own User-Name (classic markup). Its content never belongs to the
// outer post.
function quoteContainers(root: HTMLElement): HTMLElement[] {
  const nested = root.querySelectorAll("article");
  const classic = root.querySelectorAll('[role="link"]').filter((e) => e.querySelector('[data-testid="User-Name"]'));
  return [...nested, ...classic].filter((e) => e !== root);
}

function outermost(list: HTMLElement[], root: HTMLElement): HTMLElement[] {
  return list.filter((e) => !ancestors(e, root).some((p) => list.includes(p)));
}

function textRuns(node: HTMLElement): Run[] {
  const runs: Run[] = [];
  const push = (text: string, link: boolean) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.link === link) last.text += text;
    else runs.push({ text, link });
  };
  const walk = (n: Node, link: boolean) => {
    if (!isElement(n)) return push(n.text, link);
    const tag = n.rawTagName?.toLowerCase();
    if (tag === "br") return push("\n", link);
    if (tag === "img") return push(n.getAttribute("alt") ?? "", link);
    if (tag === "a") return n.childNodes.forEach((c) => walk(c, true));
    n.childNodes.forEach((c) => walk(c, link));
  };
  node.childNodes.forEach((c) => walk(c, false));
  return runs;
}

function parsePost(art: HTMLElement): Post {
  const containers = quoteContainers(art);
  const nestedRoots = outermost(containers, art);
  const own = (sel: string) =>
    art.querySelectorAll(sel).filter((e) => !nestedRoots.some((c) => c === e || ancestors(e, art).includes(c)));
  const inCard = (a: HTMLElement) => ancestors(a, art).some((p) => p.getAttribute("role") === "link");

  const profiles = own("img").filter((i) => PROFILE_URL.test(imgSrc(i)));
  const avatarImg = profiles.find((i) => (i.getAttribute("alt") ?? "").startsWith("@")) ?? profiles[0];
  let handle = "";
  if (avatarImg) {
    const alt = avatarImg.getAttribute("alt") ?? "";
    if (alt.startsWith("@")) handle = alt.slice(1);
    else {
      const link = [avatarImg, ...ancestors(avatarImg, art)].find((e) => e.tagName === "A" && e.getAttribute("href"));
      handle = link?.getAttribute("href")?.split("/")[1] ?? "";
    }
  }
  if (!handle) handle = own('a[href^="/"]')[0]?.getAttribute("href")?.split("/")[1] ?? "";

  const name = own("a")
    .filter((a) => a.getAttribute("href") === `/${handle}`)
    .map((a) => a.text.trim())
    .find((t) => t && !t.startsWith("@"));
  if (!handle || !name) throw new Error("Could not read the post author from the page.");

  const verified =
    own("[data-testid]").some((e) => e.getAttribute("data-testid") === "icon-verified") ||
    own("[aria-label]").some((e) => /verified/i.test(e.getAttribute("aria-label") ?? ""));

  const body = own('[data-testid="tweetText"]')[0] ?? own(".whitespace-pre-wrap")[0];

  const seen = new Set<string>();
  const media: Media[] = [];
  for (const m of own("img, video")) {
    const video = m.tagName === "VIDEO";
    const src = video ? (m.getAttribute("poster") ?? "") : imgSrc(m);
    if (!MEDIA_URL.test(src) || seen.has(src)) continue;
    seen.add(src);
    media.push({ url: src.replace(/name=[a-z0-9]+/, "name=large"), video: video || /video_thumb/.test(src) });
  }

  const links = own('a[href*="/status/"]').filter((a) => !inCard(a) && a.text.trim());
  const idLink = own('a[href*="/status/"]').find((a) => {
    const m = /^\/([^/]+)\/status\/(\d+)$/.exec(a.getAttribute("href") ?? "");
    return !!m && m[1].toLowerCase() === handle.toLowerCase() && !inCard(a);
  });
  const id = /\/status\/(\d+)$/.exec(idLink?.getAttribute("href") ?? "")?.[1] ?? "";
  const viewsLink = links.find((a) => /Views?\s*$/.test(a.text.trim()));
  const whenLink = links.find((a) => a !== viewsLink);
  const when = (own("time")[0] ?? whenLink)?.text.trim() ?? "";
  const views = /([\d.,]+\s*[KMB]?)\s*Views?\s*$/.exec(viewsLink?.text.trim() ?? "")?.[1].trim() ?? "";

  const stats: Post["stats"] = [];
  for (const e of own("[data-testid], [data-engagement-action]")) {
    const key = e.getAttribute("data-engagement-action") ?? e.getAttribute("data-testid") ?? "";
    const label = STATS[key];
    const count = (
      e.querySelector('[data-testid="app-text-transition-container"], .x-animated-count-visual') ?? undefined
    )?.text.trim();
    if (label && count && /\d/.test(count) && !stats.some((s) => s.label === label)) stats.push({ count, label });
  }

  const quoteRoot = nestedRoots[0];
  return {
    id,
    handle,
    name,
    avatar: avatarImg ? imgSrc(avatarImg).replace(/_(normal|x96|bigger|reasonably_small|mini)\./, "_400x400.") : "",
    verified,
    runs: body ? textRuns(body) : [],
    media: media.slice(0, MAX_MEDIA),
    quote: quoteRoot ? parsePost(quoteRoot) : undefined,
    when,
    views,
    stats,
  };
}

export function parseThread(pageHtml: string, focalId: string): Thread {
  const root = parse(pageHtml);
  const tops = root.querySelectorAll("article").filter((a) => !ancestors(a, root).some((p) => p.tagName === "ARTICLE"));
  if (!tops.length) throw new Error("No post found on the page.");

  const posts = tops.map((a) => {
    try {
      return parsePost(a);
    } catch {
      return undefined;
    }
  });
  let focalIndex = posts.findLastIndex((p) => p?.id === focalId);
  if (focalIndex < 0) focalIndex = posts.findIndex((p) => p);
  const focal = posts[focalIndex];
  if (!focal) throw new Error("Could not read the post from the page.");

  const parents = new Map<string, Post>();
  for (const p of posts.slice(0, focalIndex)) {
    if (!p?.id || p.id === focal.id) continue;
    parents.delete(p.id);
    parents.set(p.id, p);
  }
  return { parents: [...parents.values()].slice(-MAX_PARENTS), focal };
}
