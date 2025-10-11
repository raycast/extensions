export interface Prompt {
  id: string;
  name: string;
  prompt: string;
  category: Category;
}

export enum Category {
  All = "all",
  Development = "development",
  Marketing = "marketing",
  Writing = "writing",
  Research = "research",
  Design = "design",
  Business = "business",
  General = "general",
}

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.All]: "All Prompts",
  [Category.Development]: "Development",
  [Category.Marketing]: "Marketing",
  [Category.Writing]: "Writing",
  [Category.Research]: "Research",
  [Category.Design]: "Design",
  [Category.Business]: "Business",
  [Category.General]: "General",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  [Category.All]: "🎯",
  [Category.Development]: "💻",
  [Category.Marketing]: "📈",
  [Category.Writing]: "✍️",
  [Category.Research]: "🔬",
  [Category.Design]: "🎨",
  [Category.Business]: "💼",
  [Category.General]: "📋",
};
