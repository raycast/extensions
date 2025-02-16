import { CommitType, CommitTypeMetadata } from "./types";

export const COMMIT_TYPES: CommitTypeMetadata[] = [
  { value: CommitType.Feature, label: "Feat: A new feature", icon: "🚀" },
  { value: CommitType.Fix, label: "Fix: A bug fix", icon: "🐛" },
  { value: CommitType.Chore, label: "Chore: Routine maintenance", icon: "🛠" },
  { value: CommitType.Documentation, label: "Docs: Documentation changes", icon: "📚" },
  { value: CommitType.Style, label: "Style: Code style changes", icon: "💄" },
  { value: CommitType.Refactor, label: "Refactor: Code restructuring", icon: "♻" },
  { value: CommitType.Test, label: "Test: Adding or fixing tests", icon: "🧪" },
  { value: CommitType.Performance, label: "Perf: Performance improvements", icon: "⚡️" },
  { value: CommitType.CI, label: "CI: Continuous integration changes", icon: "🤖" },
];
