import { Icon, AI } from "@raycast/api";

type Example = {
  argument?: string;
  selection: string;
  output: string;
};

type BasePrompt = {
  id: string;
  title: string;
  prompt: string;
  icon: Icon;
  creativity: "none" | "low" | "medium" | "high" | "maximum";
  model?: AI.Model;
  date: `${number}-${number}-${number}`;
  example?: Example;
  author?: {
    name: string;
    link?: string;
  };
};

type PromptType = {
  type: "text";
};

type CodeType = {
  type: "code";
  language?: string;
};

export type Prompt = BasePrompt & (PromptType | CodeType);

export type PromptCategory = {
  name: string;
  slug: string;
  icon: string;
  prompts: Prompt[];
};
