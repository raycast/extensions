import { ReactElement } from "react";

export type ContentType = "word" | "short" | "long" | "meeting" | "address" | "url" | "json";

export interface ContentResult {
  type: ContentType;
  confidence: number;
  entities: {
    date?: Date;
    dateText?: string;
    location?: string;
    address?: string;
    url?: string;
  };
}

export interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  shortcut: number; // 1-9
  execute?: () => Promise<void>;
  component?: ReactElement; // For navigation-based actions
}
