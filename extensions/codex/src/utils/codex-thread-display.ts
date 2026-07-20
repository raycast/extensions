import { Color, Icon } from "@raycast/api";
import type { CodexThreadSource, CodexThreadStatus } from "./codex-app-server";

export type CodexSourceDescriptor = {
  icon: Icon;
  label: string;
  keywords: string[];
  tooltip: string;
};

export type CodexStatusDescriptor = {
  label?: string;
  tintColor: Color.ColorLike;
  tooltip: string;
};

const STATIC_SOURCE_DESCRIPTORS = {
  cli: {
    icon: Icon.Terminal,
    label: "CLI",
    keywords: ["cli"],
    tooltip: "Source: CLI",
  },
  vscode: {
    icon: Icon.ComputerChip,
    label: "VS Code",
    keywords: ["vscode", "vs code"],
    tooltip: "Source: VS Code",
  },
  exec: {
    icon: Icon.Terminal,
    label: "Exec",
    keywords: ["exec"],
    tooltip: "Source: Exec",
  },
  appServer: {
    icon: Icon.AppWindow,
    label: "App Server",
    keywords: ["app server", "appserver"],
    tooltip: "Source: App Server",
  },
  unknown: {
    icon: Icon.ComputerChip,
    label: "Unknown",
    keywords: ["unknown"],
    tooltip: "Source: Unknown",
  },
} as const satisfies Record<string, CodexSourceDescriptor>;

export function getCodexSourceDescriptor(
  source: CodexThreadSource,
): CodexSourceDescriptor {
  if (typeof source === "string") {
    return (
      STATIC_SOURCE_DESCRIPTORS[source] ?? STATIC_SOURCE_DESCRIPTORS.unknown
    );
  }

  if ("custom" in source) {
    return {
      icon: Icon.ComputerChip,
      label: `Custom: ${source.custom}`,
      keywords: ["custom", source.custom],
      tooltip: `Source: ${source.custom}`,
    };
  }

  const { subAgent } = source;

  if (typeof subAgent === "string") {
    return {
      icon: Icon.Livestream,
      label: "Subagent",
      keywords: ["sub-agent", "subagent", subAgent],
      tooltip: "Source: Subagent",
    };
  }

  if ("thread_spawn" in subAgent) {
    return {
      icon: Icon.Livestream,
      label: "Subagent",
      keywords: ["sub-agent", "subagent", "thread spawn"],
      tooltip: "Source: Spawned Subagent",
    };
  }

  return {
    icon: Icon.Livestream,
    label: "Subagent",
    keywords: ["sub-agent", "subagent", subAgent.other],
    tooltip: `Source: Subagent (${subAgent.other})`,
  };
}

const NON_ACTIVE_STATUS_DESCRIPTORS: Record<
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
    return NON_ACTIVE_STATUS_DESCRIPTORS[status.type];
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

  return { label: "Active", tintColor: Color.Green, tooltip: "Active" };
}
