import { Icon } from "@raycast/api";
import type { CommitType } from "../models/commitType";

export const COMMIT_TYPES: CommitType[] = [
  { label: "feat", emoji: "✨", accessoryIcon: Icon.PlusCircleFilled },
  { label: "fix", emoji: "🐛", accessoryIcon: Icon.Bug },
  { label: "chore", emoji: "🧹", accessoryIcon: Icon.Patch },
  { label: "refactor", emoji: "♻️", accessoryIcon: Icon.Heart },
  { label: "docs", emoji: "📝", accessoryIcon: Icon.Document },
  { label: "build", emoji: "🏗", accessoryIcon: Icon.Hammer },
  { label: "ci", emoji: "👷", accessoryIcon: Icon.Gear },
  { label: "style", emoji: "💄", accessoryIcon: Icon.Brush },
  { label: "test", emoji: "✅", accessoryIcon: Icon.CheckCircle },
  { label: "perf", emoji: "⚡️", accessoryIcon: Icon.CloudLightning },
  { label: "revert", emoji: "⏪", accessoryIcon: Icon.Redo },
];
