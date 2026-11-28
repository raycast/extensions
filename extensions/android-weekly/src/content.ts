export const ARCHIVE_URL = "https://androidweekly.net/archive";

export type Issue = {
  number: string;
  title: string;
  url: string;
  date: string;
};
export type Article = {
  title: string;
  url: string;
  description: string;
  section: string;
};

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// single pass — chained replaces double-decode "&amp;lt;" into "<"
export function decode(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-fA-F]+);/g, (m, e: string) => {
    if (e.startsWith("#")) {
      const n = e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      // fromCodePoint throws on lone surrogates — leave those raw
      const valid = n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff);
      return valid ? String.fromCodePoint(n) : m;
    }
    return NAMED[e] ?? m;
  });
}

export function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// manual format avoids Date timezone day-shifting on YYYY-MM-DD strings
export function formatDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m) {
    const mo = Number(m[2]);
    if (mo < 1 || mo > 12) return date;
    return `${MONTHS[mo - 1]} ${m[3]} ${m[1]}`;
  }
  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toDateString();
}

export function parseArchive(html: string): Issue[] {
  const issues: Issue[] = [];
  const re = /<span>\s*(\d{4}-\d{2}-\d{2})\s*<\/span>\s*<h3>\s*<a href="(\/issues\/issue-\d+)">Issue #(\d+)<\/a>/g;
  for (const m of html.matchAll(re)) {
    issues.push({
      number: m[3],
      title: `Android Weekly Issue #${m[3]}`,
      url: `https://androidweekly.net${m[2]}`,
      date: m[1],
    });
  }
  return issues;
}

export function parseArticles(html: string): Article[] {
  const sections: { name: string; index: number }[] = [];
  for (const m of html.matchAll(/font-size:\s*18px[^>]*>([^<]+)<\/span>/g)) {
    sections.push({ name: decode(m[1].trim()), index: m.index ?? 0 });
  }
  const articles: Article[] = [];
  const re =
    /<a href="(https?:\/\/[^"]+)"[^>]*>\s*([^<]+?)\s*(?:<span.*?<\/span>\s*)?<\/a><\/div><div>([\s\S]*?)<\/div>/gs;
  for (const m of html.matchAll(re)) {
    const url = m[1];
    // skip house ads, add when someone wants them
    if (url.includes("androidweekly.net/jobs")) continue;
    const title = stripTags(m[2]);
    if (!title || title.length < 3) continue;
    const index = m.index ?? 0;
    const section = [...sections].reverse().find((s) => s.index < index)?.name ?? "Articles";
    articles.push({ title, url, description: stripTags(m[3]), section });
  }
  return articles;
}

// page content is untrusted — escape markdown metacharacters so it can't inject formatting/links
function escMd(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/[[\]*_`#<>]/g, (c) => `\\${c}`);
}

// < > are never valid raw in a URL — strip them so angle-wrapped links can't break early
function safeUrl(u: string): string {
  return u.replace(/[<>]/g, "");
}

export function toArticleMarkdown(a: Article): string {
  return `# ${escMd(a.title)}\n\n${escMd(a.description)}\n\n*Source: ${escMd(hostOf(a.url))} · ${escMd(a.section)}*\n\n[Read the full article →](<${safeUrl(a.url)}>)`;
}

export function toIssueMarkdown(issue: Issue, articles: Article[]): string {
  const date = issue.date ? formatDate(issue.date) : "";
  const groups = new Map<string, Article[]>();
  for (const a of articles) {
    const list = groups.get(a.section) ?? [];
    list.push(a);
    groups.set(a.section, list);
  }
  let md = `# ${issue.title}\n${date ? `*${date} · ${articles.length} stories*\n` : ""}\n`;
  for (const [section, items] of groups) {
    md += `\n## ${escMd(section)}\n`;
    for (const a of items) {
      md += `\n### [${escMd(a.title)}](<${safeUrl(a.url)}>)\n${escMd(a.description)}\n*${escMd(hostOf(a.url))}*\n`;
    }
  }
  return md;
}
