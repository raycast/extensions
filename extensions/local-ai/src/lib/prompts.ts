import { Icon } from "@raycast/api";

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  icon: Icon;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "default",
    name: "Default",
    prompt: "",
    icon: Icon.Circle,
  },
  {
    id: "concise",
    name: "Concise",
    prompt: "Respond concisely and directly. Avoid unnecessary elaboration.",
    icon: Icon.ShortParagraph,
  },
  {
    id: "technical",
    name: "Technical",
    prompt:
      "You are a senior software engineer. Provide technical, precise answers with code examples when relevant.",
    icon: Icon.Code,
  },
  {
    id: "creative",
    name: "Creative",
    prompt: "Be creative and expressive. Think outside the box.",
    icon: Icon.LightBulb,
  },
  {
    id: "tutor",
    name: "Tutor",
    prompt:
      "Explain concepts step by step as a patient tutor would. Use analogies and examples.",
    icon: Icon.Bookmark,
  },
  {
    id: "code-review",
    name: "Code Review",
    prompt:
      "Review code for bugs, security issues, and improvements. Be thorough and specific.",
    icon: Icon.MagnifyingGlass,
  },
  {
    id: "writer",
    name: "Writer",
    prompt:
      "You are a skilled writer. Help with drafting, editing, and improving text. Focus on clarity, tone, and structure.",
    icon: Icon.Pencil,
  },
  {
    id: "analyst",
    name: "Analyst",
    prompt:
      "Analyze information methodically. Break down complex topics, identify key patterns, and provide data-driven insights.",
    icon: Icon.BarChart,
  },
];
