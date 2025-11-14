/**
 * Type definitions matching the Swift models from the iOS app
 */

export enum Priority {
  Low = "low",
  Medium = "medium",
  High = "high",
}

export interface Tag {
  id?: string;
  name: string;
  colorHex: string;
  userId: string;
  createdAt: Date;
  order: number;
}

export interface TodoItem {
  id?: string;
  title: string;
  isCompleted: boolean;
  priority?: Priority;
  dueDate?: Date;
  notes?: string;
  tagIds: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  version: number;
  lastModifiedBy?: string;
}

export interface ParsedTask {
  cleanedText: string;
  priority?: Priority;
  dueDate?: Date;
  tagIds: string[];
  detectedTags: string[];
  matchedKeywords: string[];
}
