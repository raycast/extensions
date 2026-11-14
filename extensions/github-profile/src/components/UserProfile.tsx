import { GitHubUser } from "../api/github";
import { escapeMarkdown } from "../utils/markdown";

export function formatUserProfile(user: GitHubUser): string {
  const sections = [`## ${escapeMarkdown(user.name || user.login)}`];
  if (user.bio) sections.push(escapeMarkdown(user.bio));
  sections.push(
    `**${user.followers.toLocaleString("en-US")}** followers · **${user.following.toLocaleString("en-US")}** following · **${user.public_repos.toLocaleString("en-US")}** public repositories`,
  );
  const details = [user.company, user.location].filter((value): value is string => Boolean(value));
  if (details.length) sections.push(details.map(escapeMarkdown).join(" · "));

  const links: string[] = [];
  if (user.blog) {
    try {
      const website = new URL(user.blog.startsWith("http") ? user.blog : `https://${user.blog}`);
      if (["http:", "https:"].includes(website.protocol)) links.push(`[Website](<${website.href}>)`);
    } catch {
      // An invalid optional website should not prevent the profile from rendering.
    }
  }
  if (user.twitter_username) links.push(`[Twitter](https://twitter.com/${encodeURIComponent(user.twitter_username)})`);
  const created = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(user.created_at),
  );
  links.push(`Joined ${created}`);
  sections.push(links.join(" · "));
  return sections.join("\n\n");
}
