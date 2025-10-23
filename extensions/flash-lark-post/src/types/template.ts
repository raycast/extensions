/**
 * タスクテンプレート関連の型定義
 */

import { TaskPriority } from "./task";

// タスクテンプレート
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  title: string;
  content?: string;
  priority?: TaskPriority;
  dueOffset?: number; // 作成日からの日数オフセット
  reminderMinutes?: number;
  tasklistGuid?: string;
  assigneeId?: string;
  tags?: string[];
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
}

// テンプレート変数
export interface TemplateVariable {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "select";
  defaultValue?: string;
  options?: string[]; // select type用
  required?: boolean;
}

// 動的テンプレート
export interface DynamicTaskTemplate extends TaskTemplate {
  variables?: TemplateVariable[];
  titleTemplate?: string; // 変数を含むタイトルテンプレート
  contentTemplate?: string; // 変数を含む内容テンプレート
}

// テンプレート作成リクエスト
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  title: string;
  content?: string;
  priority?: TaskPriority;
  dueOffset?: number;
  reminderMinutes?: number;
  tasklistGuid?: string;
  assigneeId?: string;
  tags?: string[];
  variables?: TemplateVariable[];
  titleTemplate?: string;
  contentTemplate?: string;
}

// テンプレート更新リクエスト
export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

// テンプレートカテゴリ
export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  templates: TaskTemplate[];
}

// ビルトインテンプレート
export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  content?: string;
  priority: TaskPriority;
  dueOffset?: number;
  reminderMinutes?: number;
  tags: string[];
  category: string;
  variables?: TemplateVariable[];
  titleTemplate?: string;
  contentTemplate?: string;
}

// テンプレート使用統計
export interface TemplateUsageStats {
  templateId: string;
  usageCount: number;
  lastUsed: string;
  averageCompletionTime?: number; // 分単位
}

// テンプレート検索フィルター
export interface TemplateFilter {
  category?: string;
  tags?: string[];
  priority?: TaskPriority;
  hasVariables?: boolean;
  isBuiltIn?: boolean;
  searchText?: string;
}

// テンプレート適用結果
export interface TemplateApplyResult {
  title: string;
  content?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  reminderMinutes?: number;
  tasklistGuid?: string;
  assigneeId?: string;
  variables?: Record<string, string>;
}

// テンプレート変数値
export interface TemplateVariableValues {
  [key: string]: string;
}

// テンプレートエクスポート/インポート
export interface TemplateExportData {
  version: string;
  exportDate: string;
  templates: TaskTemplate[];
  categories?: TemplateCategory[];
}

export interface TemplateImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}
