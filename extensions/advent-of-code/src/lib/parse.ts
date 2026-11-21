import TurndownService from "turndown";

export type ParsedPuzzle = { title: string; markdown: string; answers: string[] };
export type SubmitStatus = "correct" | "wrong" | "wait" | "solved";

const turndown = new TurndownService({ codeBlockStyle: "fenced", headingStyle: "atx", emDelimiter: "*" });
// Advent of Code highlights key phrases with <em>, which reads better bold, except inside code where Markdown can't format
turndown.addRule("emphasis", {
  filter: "em",
  replacement: (content, node) =>
    (node as unknown as { parentNode?: { nodeName?: string } }).parentNode?.nodeName === "CODE"
      ? content
      : `**${content}**`,
});
// "--- Day 5: Supply Stacks ---" becomes a plain heading
turndown.addRule("heading", {
  filter: "h2",
  replacement: (content) => `\n\n## ${content.replace(/^\\?-+\s*|\s*-+$/g, "")}\n\n`,
});

export function parsePuzzle(html: string, day: number): ParsedPuzzle {
  const articles = [...html.matchAll(/<article class="day-desc">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
  if (articles.length === 0) throw new Error("Couldn't read the puzzle page.");

  const title = decodeEntities(articles[0].match(/<h2[^>]*>--- (Day \d+: .*?) ---<\/h2>/)?.[1] ?? `Day ${day}`);
  const answers = [...html.matchAll(/Your puzzle answer was <code>([^<]*)<\/code>/g)].map((m) => decodeEntities(m[1]));
  const markdown = articles
    .map((article, index) => {
      const answer = answers[index];
      return turndown.turndown(article) + (answer === undefined ? "" : `\n\n> ⭐ Your puzzle answer was \`${answer}\``);
    })
    .join("\n\n");

  return { title, markdown, answers };
}

export function parseSubmit(html: string): { status: SubmitStatus; message: string } {
  const article = html.match(/<article>([\s\S]*?)<\/article>/)?.[1] ?? "";
  const message = decodeEntities(article.replace(/<[^>]+>/g, "").replace(/\s+/g, " "))
    .replace(/\[(Return to|Continue to)[^\]]*\]/g, "")
    .trim();

  if (/that's the right answer/i.test(message)) return { status: "correct", message };
  if (/answer too recently/i.test(message)) return { status: "wait", message };
  if (/don't seem to be solving the right level/i.test(message)) return { status: "solved", message };
  return { status: "wrong", message };
}

export function parseCalendarStars(html: string): Record<number, number> {
  const perfect = html.includes("calendar calendar-perfect");
  const stars: Record<number, number> = {};
  for (const match of html.matchAll(/<a\b[^>]*class="calendar-day(\d+)( calendar-(?:very)?complete)?"/g)) {
    const day = Number(match[1]);
    stars[day] = perfect || match[2] === " calendar-verycomplete" ? 2 : match[2] === " calendar-complete" ? 1 : 0;
  }
  return stars;
}

export function parseYearStars(html: string): Record<number, number> {
  const stars: Record<number, number> = {};
  for (const event of html.matchAll(/<div class="eventlist-event">([\s\S]*?)<\/div>/g)) {
    const year = event[1].match(/\[(\d{4})\]/)?.[1];
    if (!year) continue;
    stars[Number(year)] = Number(event[1].match(/class="star-count">\s*(\d+)\*/)?.[1] ?? 0);
  }
  return stars;
}

export function parseLeaderboardIds(html: string): string[] {
  return [...new Set([...html.matchAll(/\/leaderboard\/private\/view\/(\d+)/g)].map((m) => m[1]))];
}

export function isLoggedOut(html: string): boolean {
  return /href="\/\d{4}\/auth\/login"/.test(html) || /please log in/i.test(html);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
