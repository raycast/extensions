import { ImageMask } from "@raycast/api";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { Repository } from "./types";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" });

function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "twitter") as string;
}

export function getSubtitle(repository: Repository) {
  const count = numberFormatter.format(repository.stargazers_count);
  return `★ ${count}`;
}

export function getIcon(repository: Repository) {
  return repository.owner?.avatar_url ? { source: repository.owner.avatar_url, mask: ImageMask.Circle } : undefined;
}

export function getAccessoryTitle(repository: Repository) {
  let title = formatDate(repository.updated_at);

  if (repository.language) {
    title = `${repository.language}  •  ${title}`;
  }

  return title;
}
