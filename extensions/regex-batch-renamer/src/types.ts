export interface RegexRule {
  id: string;
  find: string;
  replace: string;
  flags?: string;
  description?: string;
}

export interface RenameJob {
  id: string;
  name: string;
  description?: string;
  rules: RegexRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RenameResult {
  success: boolean;
  originalPath: string;
  originalName: string;
  newPath?: string;
  newName?: string;
  error?: string;
  appliedRules: string[];
}

export interface JobExecution {
  jobId: string;
  jobName: string;
  executedAt: Date;
  results: RenameResult[];
  successCount: number;
  failureCount: number;
  skippedCount: number;
}
