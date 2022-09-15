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

export const WEB_IDES = [
  {
    title: "GitHub Dev",
    baseUrl: "https://github.dev/",
  },
  {
    title: "VSCode Dev",
    baseUrl: "https://vscode.dev/github/",
  },
  {
    title: "CodeSandbox",
    baseUrl: `https://codesandbox.io/s/github/`,
  },
  {
    title: "Repl.it",
    baseUrl: `https://repl.it/github/`,
  },
  {
    title: "Gitpod",
    baseUrl: `https://gitpod.io/#https://github.com/`,
  },
  {
    title: "Glitch",
    baseUrl: "https://glitch.com/edit/#!/import/github/",
  },
  {
    title: "Sourcegraph",
    baseUrl: `https://sourcegraph.com/github.com/`,
  },
  {
    title: "VSCode Remote Repositories",
    baseUrl: "vscode://GitHub.remotehub/open?url=https://github.com/",
    icon: "vscode-action-icon.png",
  },
];
