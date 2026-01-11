import { AI } from "@raycast/api";

// Recipe definition
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  defaultModel: AI.Model;
  creativity: AI.Creativity;
  tagIds: string[];
  inputType?: string;
  outputType?: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  usageCount: number;
  promptVersions: PromptVersion[];
}

// Prompt version
export interface PromptVersion {
  id: string;
  prompt: string;
  createdAt: number;
  note?: string;
}

// Tag definition
export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  createdAt: number;
}

// Tag colors
export type TagColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "magenta" | "brown";

// Usage record
export interface UsageRecord {
  id: string;
  recipeId: string;
  input: string;
  output: string;
  additionalPrompt?: string;
  model: AI.Model;
  createdAt: number;
}

// Create recipe form values
export interface CreateRecipeFormValues {
  name: string;
  description?: string;
  systemPrompt: string;
  defaultModel: string;
  creativity: string;
  tagIds: string[];
  inputType?: string;
  outputType?: string;
}

// Use recipe form values
export interface UseRecipeFormValues {
  input: string;
  additionalPrompt?: string;
  model?: string;
}

// Creativity options
export const CREATIVITY_OPTIONS: { value: AI.Creativity; label: string }[] = [
  { value: "none", label: "None (Precise)" },
  { value: "low", label: "Low (Grammar)" },
  { value: "medium", label: "Medium (General)" },
  { value: "high", label: "High (Creative)" },
  { value: "maximum", label: "Maximum (Brainstorm)" },
];

// Tag color options
export const TAG_COLORS: { value: TagColor; label: string; hex: string }[] = [
  { value: "red", label: "Red", hex: "#FF6B6B" },
  { value: "orange", label: "Orange", hex: "#FFA94D" },
  { value: "yellow", label: "Yellow", hex: "#FFD43B" },
  { value: "green", label: "Green", hex: "#69DB7C" },
  { value: "blue", label: "Blue", hex: "#4DABF7" },
  { value: "purple", label: "Purple", hex: "#B197FC" },
  { value: "magenta", label: "Magenta", hex: "#F783AC" },
  { value: "brown", label: "Brown", hex: "#A78B71" },
];
