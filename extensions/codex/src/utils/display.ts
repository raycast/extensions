import { Color, Icon, type Image, List } from "@raycast/api";
import type {
  CodexThread,
  CodexThreadSource,
  CodexThreadStatus,
} from "./app-server";
import { formatTimestampSeconds } from "./format";
import { getSystemSubagentKind } from "./threads";

export const agentColor = "#E08FD4";
const cliColor = "#3DBDB0";
export const maintenanceColor = "#E8873A";
const guardianColor = "#9AA8B8";
export const automationColor = "#8B8CF5";

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const modelFamilyColors: Record<string, Color.ColorLike> = {
  astra: "#C99BE8",
  luna: "#9FB4E6",
  sol: "#F0B45A",
  terra: "#6FBF8C",
};

// Only xhigh reads wrong when simply capitalized.
const effortLabels: Record<string, string> = { xhigh: "XHigh" };

// "gpt-5.6-sol" at "high" reads as one "Sol High" tag.
export function getModelTag(
  model: string,
  reasoningEffort: string | null,
): { text: string; color: Color.ColorLike } {
  const family = model.slice(model.lastIndexOf("-") + 1);
  const name = family in modelFamilyColors ? capitalize(family) : model;
  const effort = reasoningEffort
    ? (effortLabels[reasoningEffort] ?? capitalize(reasoningEffort))
    : null;

  return {
    text: effort ? `${name} ${effort}` : name,
    color: modelFamilyColors[family] ?? Color.SecondaryText,
  };
}
export const subagentIcon = {
  source: { light: "subagent-light.svg", dark: "subagent-dark.svg" },
};
export const automationIcon = {
  source: { light: "automation-light.svg", dark: "automation-dark.svg" },
};

export type CodexSourceDescriptor = {
  icon: Image.Source;
  label: string;
  keywords: string[];
  tooltip: string;
  color: Color.ColorLike;
  isSubagent: boolean;
};

export type CodexStatusDescriptor = {
  label?: string;
  tintColor: Color.ColorLike;
  tooltip: string;
};

const staticSourceDescriptors = {
  cli: {
    icon: { light: "cli-light.svg", dark: "cli-dark.svg" },
    label: "CLI",
    keywords: ["cli"],
    tooltip: "Source: CLI",
    color: cliColor,
    isSubagent: false,
  },
  vscode: {
    icon: { light: "codex-app-light.svg", dark: "codex-app-dark.svg" },
    label: "Codex App",
    keywords: ["codex", "codex app", "chatgpt"],
    tooltip: "Source: Codex App",
    color: Color.Blue,
    isSubagent: false,
  },
  exec: {
    icon: { light: "headless-light.svg", dark: "headless-dark.svg" },
    label: "Headless",
    keywords: ["exec", "headless"],
    tooltip: "Source: Headless",
    color: Color.Purple,
    isSubagent: false,
  },
  appServer: {
    icon: Icon.AppWindow,
    label: "App Server",
    keywords: ["app server", "appserver"],
    tooltip: "Source: App Server",
    color: Color.Blue,
    isSubagent: false,
  },
  unknown: {
    icon: Icon.ComputerChip,
    label: "Unknown",
    keywords: ["unknown"],
    tooltip: "Source: Unknown",
    color: Color.SecondaryText,
    isSubagent: false,
  },
} as const satisfies Record<string, CodexSourceDescriptor>;

const maintenanceSourceDescriptors: Record<
  "review" | "compact" | "memory_consolidation",
  Pick<CodexSourceDescriptor, "label" | "keywords" | "tooltip">
> = {
  review: {
    label: "Review",
    keywords: ["review", "code review"],
    tooltip: "Source: Codex code review",
  },
  compact: {
    label: "Compaction",
    keywords: ["compact", "compaction"],
    tooltip: "Source: Codex conversation compaction",
  },
  memory_consolidation: {
    label: "Memory",
    keywords: ["memory", "memory consolidation"],
    tooltip: "Source: Codex memory consolidation",
  },
};

export function getCodexSourceDescriptor(
  source: CodexThreadSource,
): CodexSourceDescriptor {
  if (typeof source === "string") {
    return staticSourceDescriptors[source] ?? staticSourceDescriptors.unknown;
  }

  if ("custom" in source) {
    return {
      icon: Icon.ComputerChip,
      label: `Custom: ${source.custom}`,
      keywords: ["custom", source.custom],
      tooltip: `Source: ${source.custom}`,
      color: Color.SecondaryText,
      isSubagent: false,
    };
  }

  const { subAgent } = source;

  if (typeof subAgent === "string") {
    return {
      ...maintenanceSourceDescriptors[subAgent],
      icon: Icon.Gear,
      color: maintenanceColor,
      isSubagent: false,
    };
  }

  if ("thread_spawn" in subAgent) {
    return {
      icon: subagentIcon.source,
      label: "Subagent",
      keywords: ["sub-agent", "subagent", "thread spawn"],
      tooltip: "Source: Subagent",
      color: agentColor,
      isSubagent: true,
    };
  }

  const systemKind = getSystemSubagentKind(subAgent.other);
  if (systemKind === "guardian") {
    return {
      icon: { light: "guardian-light.svg", dark: "guardian-dark.svg" },
      label: "Guardian",
      keywords: ["guardian", "auto review", "approval"],
      tooltip: "Source: Codex Guardian approval review",
      color: guardianColor,
      isSubagent: false,
    };
  }
  if (systemKind === "automation") {
    return {
      icon: automationIcon.source,
      label: "Automation",
      keywords: ["automation", "agent job", "scheduled"],
      tooltip: "Source: Codex automation",
      color: automationColor,
      isSubagent: false,
    };
  }

  return {
    icon: subagentIcon.source,
    label: "Subagent",
    keywords: ["sub-agent", "subagent", subAgent.other],
    tooltip: `Source: Subagent (${subAgent.other})`,
    color: agentColor,
    isSubagent: true,
  };
}

const nonActiveStatusDescriptors: Record<
  "systemError" | "notLoaded" | "idle",
  CodexStatusDescriptor
> = {
  systemError: {
    label: "Error",
    tintColor: Color.Red,
    tooltip: "System error",
  },
  notLoaded: { tintColor: Color.SecondaryText, tooltip: "Not loaded" },
  idle: { tintColor: Color.SecondaryText, tooltip: "Idle" },
};

export function getCodexStatusDescriptor(
  status: CodexThreadStatus,
): CodexStatusDescriptor {
  if (status.type !== "active") {
    return nonActiveStatusDescriptors[status.type];
  }

  if (status.activeFlags.includes("waitingOnApproval")) {
    return {
      label: "Approval",
      tintColor: Color.Orange,
      tooltip: "Waiting on approval",
    };
  }

  if (status.activeFlags.includes("waitingOnUserInput")) {
    return {
      label: "Input",
      tintColor: Color.Blue,
      tooltip: "Waiting on user input",
    };
  }

  return {
    label: "Running",
    tintColor: Color.Green,
    tooltip: "Codex is working on this thread",
  };
}

export function getThreadIconAccessory(thread: CodexThread): {
  value: Image.ImageLike;
  tooltip: string;
} {
  const sourceDescriptor = getCodexSourceDescriptor(thread.source);
  const statusDescriptor = getCodexStatusDescriptor(thread.status);

  return {
    value: {
      source: sourceDescriptor.icon,
      ...(statusDescriptor.label
        ? { tintColor: statusDescriptor.tintColor }
        : {}),
    },
    tooltip: sourceDescriptor.tooltip,
  };
}

export function getStatusAccessory(
  thread: CodexThread,
): List.Item.Accessory | undefined {
  const statusDescriptor = getCodexStatusDescriptor(thread.status);

  if (!statusDescriptor.label) {
    return undefined;
  }

  return {
    tag: {
      value: statusDescriptor.label,
      color: statusDescriptor.tintColor,
    },
    tooltip: statusDescriptor.tooltip,
  };
}

export function getBranchSubtitle(
  thread: CodexThread,
): { value: string; tooltip: string } | undefined {
  const branch = thread.gitInfo?.branch?.trim();
  if (!branch) {
    return undefined;
  }

  return {
    value: `${branch === "main" ? "⌂" : "⑂"} ${branch}`,
    tooltip: `Git branch: ${branch}`,
  };
}

export function getUpdatedAtAccessory(
  thread: CodexThread,
): List.Item.Accessory {
  return {
    date: new Date(thread.updatedAt * 1000),
    tooltip: `Updated ${formatTimestampSeconds(thread.updatedAt)}`,
  };
}
