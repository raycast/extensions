import { Color, Icon, List } from "@raycast/api";
import { addDays, format, isToday, isYesterday, startOfToday } from "date-fns";
import { readFileSync } from "fs";
import imageSize from "image-size";
import { useCachedState } from "@raycast/utils";
import { Agent } from "./cursor";

export function getStatusIcon(agent: Agent) {
  let icon: List.Item.Props["icon"];

  switch (agent.status) {
    case "RUNNING":
      icon = {
        value: { source: Icon.CircleEllipsis, tintColor: Color.Blue },
        tooltip: "Status: Running",
      };
      break;
    case "FINISHED":
      icon = {
        value: { source: Icon.CheckCircle, tintColor: Color.Green },
        tooltip: "Status: Finished",
      };
      break;
    case "ERROR":
      icon = {
        value: { source: Icon.XMarkCircle, tintColor: Color.Red },
        tooltip: "Status: Failed",
      };
      break;
    case "CREATING":
      icon = {
        value: { source: Icon.CircleEllipsis, tintColor: Color.Yellow },
        tooltip: "Status: Creating",
      };
      break;
    case "EXPIRED":
      icon = {
        value: { source: Icon.CircleDisabled, tintColor: Color.SecondaryText },
        tooltip: "Status: Expired",
      };
      break;
    default:
      icon = {
        value: { source: Icon.CircleDisabled, tintColor: Color.PrimaryText },
        tooltip: "Status: Unknown",
      };
      break;
  }

  return icon;
}

export function getStatusIconSimple(agent: Agent) {
  switch (agent.status) {
    case "RUNNING":
      return Icon.CircleEllipsis;
    case "FINISHED":
      return Icon.CheckCircle;
    case "ERROR":
      return Icon.XMarkCircle;
    case "CREATING":
      return Icon.CircleEllipsis;
    case "EXPIRED":
      return Icon.CircleDisabled;
    default:
      return Icon.CircleDisabled;
  }
}

export function getAccessories(
  agent: Agent,
  opts: {
    hideCreatedAt?: boolean;
    hidePrUrl?: boolean;
    hideRepository?: boolean;
    hideStatus?: boolean;
  } = {},
) {
  const accessories: List.Item.Props["accessories"] = [];

  if (!opts.hidePrUrl && agent.target.prUrl) {
    accessories.push({
      icon: { source: "pull-request-open.svg", tintColor: Color.SecondaryText },
      tooltip: `Pull Request: ${agent.target.prUrl}`,
    });
  }

  if (!opts.hideRepository && agent.source.repository) {
    accessories.push({
      text: getRepositoryName(agent),
      tooltip: `Repository: ${agent.source.repository}`,
    });
  }

  if (!opts.hideCreatedAt && agent.createdAt) {
    const createdAt = new Date(agent.createdAt);
    accessories.push({
      date: createdAt,
      tooltip: `Created: ${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    });
  }

  return accessories;
}

export function getRepositoryName(agentOrRepoUrl: Agent | string) {
  let repoUrl: string;
  if (typeof agentOrRepoUrl === "string") {
    repoUrl = agentOrRepoUrl;
  } else {
    repoUrl = agentOrRepoUrl.source.repository;
  }
  if (!repoUrl.startsWith("http://") && !repoUrl.startsWith("https://")) {
    repoUrl = "https://" + repoUrl;
  }
  const url = new URL(repoUrl);
  return url.pathname.slice(1);
}

export function processImages(images?: string[]) {
  return images?.map((image) => {
    const fileBuffer = readFileSync(image);
    const base64Data = fileBuffer.toString("base64");
    const dimensions = imageSize(fileBuffer);
    return {
      data: base64Data,
      dimension: {
        width: dimensions.width ?? 1024,
        height: dimensions.height ?? 768,
      },
    };
  });
}

export function groupAgents(agents?: Agent[]) {
  const groupedAgents = {
    today: new Array<Agent>(),
    yesterday: new Array<Agent>(),
    thisWeek: new Array<Agent>(),
    thisMonth: new Array<Agent>(),
    older: new Array<Agent>(),
  };

  if (!agents) {
    return groupedAgents;
  }

  const sevenDaysAgo = addDays(startOfToday(), -7);
  const thirtyDaysAgo = addDays(startOfToday(), -30);

  agents.forEach((agent) => {
    const createdAt = new Date(agent.createdAt);
    if (isToday(createdAt)) {
      groupedAgents.today.push(agent);
    } else if (isYesterday(createdAt)) {
      groupedAgents.yesterday.push(agent);
    } else if (createdAt >= sevenDaysAgo) {
      groupedAgents.thisWeek.push(agent);
    } else if (createdAt >= thirtyDaysAgo && createdAt < sevenDaysAgo) {
      groupedAgents.thisMonth.push(agent);
    } else {
      groupedAgents.older.push(agent);
    }
  });

  return groupedAgents;
}

export function formatPrTitle(prUrl: string) {
  const pr = extractPR(prUrl);
  return pr ? `PR ${pr.number}` : prUrl;
}

export function formatPrSubtitle(prUrl: string) {
  const pr = extractPR(prUrl);
  return pr ? `${pr.owner}/${pr.name}` : undefined;
}

export function extractPR(prUrl: string) {
  try {
    const url = new URL(prUrl);
    const pathParts = url.pathname.split("/");

    if (url.hostname === "github.com" && pathParts.length >= 5 && pathParts[3] === "pull") {
      const owner = pathParts[1];
      const name = pathParts[2];
      const number = pathParts[4];
      return { number, owner, name };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function useRepositories() {
  const [repositories, setRepositories] = useCachedState<string[]>("repositories", []);

  const addRepository = (repositoryUrl: string) => {
    if (!repositories.includes(repositoryUrl)) {
      setRepositories([...repositories, repositoryUrl]);
    }
    return repositoryUrl;
  };

  const removeRepository = (repositoryUrl: string) => {
    setRepositories(repositories.filter((url) => url !== repositoryUrl));
  };

  return {
    repositories,
    addRepository,
    removeRepository,
  };
}

export function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}
