import { Color, Icon } from "@raycast/api";
import type { CategoryId } from "../types";

export const CATEGORY_ORDER: CategoryId[] = [
  "getting-started",
  "cli",
  "slash",
  "keyboard",
  "models",
  "configuration",
  "tools",
  "skills-memory",
  "gateway",
  "automation",
  "mcp",
  "environment",
  "troubleshooting",
];

export const CATEGORIES: Record<CategoryId, { title: string; icon: Icon; color: Color }> = {
  "getting-started": {
    title: "Getting Started",
    icon: Icon.Rocket,
    color: Color.Green,
  },
  cli: {
    title: "CLI Commands",
    icon: Icon.Terminal,
    color: Color.Blue,
  },
  slash: {
    title: "Slash Commands",
    icon: Icon.TextInput,
    color: Color.Purple,
  },
  keyboard: {
    title: "Keyboard Shortcuts",
    icon: Icon.Keyboard,
    color: Color.Magenta,
  },
  models: {
    title: "Models & Providers",
    icon: Icon.Stars,
    color: Color.Yellow,
  },
  configuration: {
    title: "Configuration & Security",
    icon: Icon.Gear,
    color: Color.Orange,
  },
  tools: {
    title: "Tools & Toolsets",
    icon: Icon.Hammer,
    color: Color.Red,
  },
  "skills-memory": {
    title: "Skills & Memory",
    icon: Icon.MemoryChip,
    color: Color.Green,
  },
  gateway: {
    title: "Gateway & Messaging",
    icon: Icon.Message,
    color: Color.Blue,
  },
  automation: {
    title: "Cron & Automation",
    icon: Icon.Clock,
    color: Color.Purple,
  },
  mcp: {
    title: "MCP Integration",
    icon: Icon.Link,
    color: Color.Magenta,
  },
  environment: {
    title: "Environment Variables",
    icon: Icon.Code,
    color: Color.Yellow,
  },
  troubleshooting: {
    title: "Troubleshooting",
    icon: Icon.QuestionMarkCircle,
    color: Color.Red,
  },
};
