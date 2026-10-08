export type CategoryType = "all" | "basic" | "flag" | "slash" | "thinking" | "settings" | "environment";
export type BudgetType = "max" | "mid" | "min";

export interface Command {
  id: string;
  name: string;
  description: string;
  usage: string;
  example?: string;
  deprecated?: boolean;
  warning?: boolean;
  isNew?: boolean;
  alternative?: string;
  category: Exclude<CategoryType, "all">;
  tags: string[];
}

export interface ThinkingKeyword {
  keyword: string;
  budget: BudgetType;
  tokens: number;
  description: string;
  example?: string;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  commands?: Command[];
  thinkingKeywords?: ThinkingKeyword[];
}

export interface CheatsheetData {
  sections: Section[];
}
