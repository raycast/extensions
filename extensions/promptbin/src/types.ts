// types.ts
export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUsed?: Date;
  dateCreated: Date;
  isFavorite?: boolean;
}

export interface BackupListProps {
  loadPrompts: () => Promise<void>;
}