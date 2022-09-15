import { Image, List } from "@raycast/api";
import { Repository } from "./types";

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" });

export function getSubtitle(repository: Repository) {
  const star = repository.viewerHasStarred ? "★" : "✩";
  const count = numberFormatter.format(repository.stargazerCount);
  return `${star} ${count}`;
}

export function getIcon(repository: Repository) {
  return repository.owner?.avatarUrl ? { source: repository.owner.avatarUrl, mask: Image.Mask.Circle } : undefined;
}

export function getAccessories(repository: Repository) {
  const accessories: List.Item.Accessory[] = [
    {
      text: repository.primaryLanguage?.name,
    },
    {
      date: typeof repository.updatedAt === "string" ? new Date(repository.updatedAt) : undefined,
      tooltip: `Updated at: ${new Date(repository.updatedAt).toLocaleString()}`,
    },
  ];

  return accessories;
}
