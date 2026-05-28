import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { join } from "node:path";
import { copyToClipboard, openInEditor } from "../lib/actions";
import { SkillDetail } from "./SkillDetail";
import type { Recommendation } from "../lib/types";

function iconFor(rec: Recommendation) {
  return rec.skill.source.includes("plugin")
    ? { source: Icon.Plug, tintColor: Color.Purple }
    : { source: Icon.Box, tintColor: Color.Blue };
}

const CONF: Record<
  Recommendation["confidence"],
  { value: string; color: Color }
> = {
  high: { value: "high", color: Color.Green },
  medium: { value: "medium", color: Color.Yellow },
  low: { value: "low", color: Color.SecondaryText },
};

export function RecommendationItem({
  rec,
  onRerun,
  onToggleDetail,
}: {
  rec: Recommendation;
  onRerun: () => void;
  onToggleDetail: () => void;
}) {
  const s = rec.skill;
  const conf = CONF[rec.confidence];
  const slash =
    s.source.includes("plugin") && s.marketplace
      ? `/${s.marketplace}:${s.name}`
      : `/${s.name}`;
  return (
    <List.Item
      icon={iconFor(rec)}
      title={s.name}
      subtitle={rec.why}
      accessories={[
        ...s.surfaces.map((surf) => ({ tag: surf })),
        { tag: { value: conf.value, color: conf.color } },
      ]}
      detail={<SkillDetail skill={s} issues={[]} />}
      actions={
        <ActionPanel>
          <Action
            title="Copy Skill Name"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(s.name)}
          />
          <Action
            title="Re-run Recommendation"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onRerun}
          />
          <Action
            title="Toggle Detail"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title="Copy as /command"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => copyToClipboard(slash)}
          />
          <Action
            title="Open in Editor"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => openInEditor(join(s.primary.realPath, "SKILL.md"))}
          />
          <Action.ShowInFinder
            path={s.primary.realPath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action
            title="Open in Search Skills"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={() =>
              launchCommand({
                name: "search-skills",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </ActionPanel>
      }
    />
  );
}
