export enum CommitType {
  Feature = "feat",
  Fix = "fix",
  Chore = "chore",
  Documentation = "docs",
  Style = "style",
  Refactor = "refactor",
  Test = "test",
  Performance = "perf",
  CI = "ci",
}

export interface CommitTypeMetadata {
  value: string;
  label: string;
  icon: string;
}

export interface CommitMessage {
  type: string;
  scope?: string;
  message: string;
  body?: string;
  footer?: string;
  isBreaking?: boolean;
}
