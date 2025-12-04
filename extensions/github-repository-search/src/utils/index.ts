import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { Image } from "@raycast/api";
import type { Repository } from "@/types";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" });

function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "twitter") as string;
}

export function getSubtitle(repository: Repository) {
  const star = repository.viewerHasStarred ? "★" : "✩";
  const count = numberFormatter.format(repository.stargazerCount);
  return `${star} ${count}`;
}

export function getIcon(repository: Repository) {
  return repository.owner?.avatarUrl ? { source: repository.owner.avatarUrl, mask: Image.Mask.Circle } : undefined;
}

export function getAccessoryTitle(repository: Repository) {
  let title = formatDate(repository.updatedAt);

  if (repository.primaryLanguage?.name) {
    title = `${repository.primaryLanguage?.name}  •  ${title}`;
  }

  return title;
}
