export type McpServerDoc = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  enabled?: boolean;
  description?: string;
  [key: string]: unknown;
};

export type McpServer = {
  name: string;
} & McpServerDoc;

export type SkillMetadata = {
  name?: string;
  description?: string;
  version?: string;
  tags?: string[];
};

export type Skill = {
  name: string;
  path: string;
  hasSkillFile: boolean;
  metadata?: SkillMetadata;
  description?: string;
  fileCount?: number;
};

export type ValidationIssue = {
  id: string;
  title: string;
  detail?: string;
  severity: "error" | "warning";
  action?: "openConfig" | "openSkills";
};
