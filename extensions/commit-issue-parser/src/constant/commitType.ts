import type { CommitType } from "../models/commitType";

export const COMMIT_TYPES: CommitType[] = [
  { label: "feat", emoji: "✨" },
  { label: "fix", emoji: "🐛" },
  { label: "chore", emoji: "🧹" },
  { label: "refactor", emoji: "♻️" },
  { label: "docs", emoji: "📝" },
  { label: "build", emoji: "🏗" },
  { label: "ci", emoji: "👷" },
  { label: "style", emoji: "💄" },
  { label: "test", emoji: "✅" },
  { label: "perf", emoji: "⚡️" },
  { label: "revert", emoji: "⏪" },
];
