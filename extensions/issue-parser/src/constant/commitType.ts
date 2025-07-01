import type { COMMIT_TYPE } from "../models/commitType";

export const COMMIT_TYPES: COMMIT_TYPE[] = [
  { label: "feat", emoji: "✨" },
  { label: "fix", emoji: "🐛" },
  { label: "docs", emoji: "📝" },
  { label: "build", emoji: "🏗" },
  { label: "ci", emoji: "👷" },
  { label: "chore", emoji: "🧹" },
  { label: "refactor", emoji: "♻️" },
  { label: "perf", emoji: "⚡️" },
  { label: "test", emoji: "✅" },
  { label: "style", emoji: "💄" },
  { label: "revert", emoji: "⏪" },
  { label: "wip", emoji: "🚧" },
];
