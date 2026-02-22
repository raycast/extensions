export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tokenCount?: number;
  cost?: number;
}

export interface Stats {
  totalCost: number;
  totalTokens: number;
  sessions: Session[];
}

export interface CustomCommand {
  name: string;
  description?: string;
  agent?: string;
  model?: string;
  template: string;
  isSystem?: boolean;
}

export interface CheatsheetItem {
  command: string;
  description: string;
  category: "TUI" | "CLI" | "Web";
}
