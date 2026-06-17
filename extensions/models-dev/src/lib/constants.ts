import { Icon, Color } from "@raycast/api";
import { Capability } from "./types";

/**
 * Capability definitions with icons and colors
 */
export const CAPABILITIES: Record<
  Capability,
  {
    label: string;
    icon: Icon;
    color: Color;
    description: string;
  }
> = {
  reasoning: {
    label: "Reasoning",
    icon: Icon.LightBulb,
    color: Color.Yellow,
    description: "Chain-of-thought reasoning capabilities",
  },
  tool_call: {
    label: "Tool Calling",
    icon: Icon.Hammer,
    color: Color.Blue,
    description: "Function/tool calling support",
  },
  vision: {
    label: "Vision",
    icon: Icon.Image,
    color: Color.Purple,
    description: "Image understanding capabilities",
  },
  audio: {
    label: "Audio",
    icon: Icon.Microphone,
    color: Color.Orange,
    description: "Audio input or output support",
  },
  video: {
    label: "Video",
    icon: Icon.Video,
    color: Color.Red,
    description: "Video understanding capabilities",
  },
  pdf: {
    label: "PDF",
    icon: Icon.Document,
    color: Color.Green,
    description: "PDF document processing",
  },
  structured_output: {
    label: "Structured Output",
    icon: Icon.Code,
    color: Color.Magenta,
    description: "JSON/structured output support",
  },
  open_weights: {
    label: "Open Weights",
    icon: Icon.LockUnlocked,
    color: Color.Green,
    description: "Model weights publicly available",
  },
};

/**
 * All capability keys
 */
export const ALL_CAPABILITIES: Capability[] = [
  "reasoning",
  "tool_call",
  "vision",
  "audio",
  "video",
  "pdf",
  "structured_output",
  "open_weights",
];

/**
 * Pricing tier colors
 */
export const PRICING_TIER_COLORS = {
  free: Color.Green,
  budget: Color.Blue,
  standard: Color.Yellow,
  premium: Color.Red,
} as const;

/**
 * Status colors
 */
export const STATUS_COLORS = {
  alpha: Color.Orange,
  beta: Color.Yellow,
  deprecated: Color.Red,
} as const;

/**
 * Sort options for models
 */
export const SORT_OPTIONS = [
  { id: "name", label: "Name" },
  { id: "provider", label: "Provider" },
  { id: "price-asc", label: "Price (Low to High)" },
  { id: "price-desc", label: "Price (High to Low)" },
  { id: "context-desc", label: "Context (Largest)" },
  { id: "context-asc", label: "Context (Smallest)" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["id"];
