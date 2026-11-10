import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ComponentProps } from "react";
import { artMarkdown } from "../art";
import { TASK_BY_ID } from "../engine/data";
import { count, maxHp } from "../engine/engine";
import { bar, formatBuffs, formatCredits, formatMarks } from "../engine/format";
import { bountyTarget } from "../engine/bounty";
import { GameState } from "../engine/types";
import { EAT_LEVELS, SKILL_ICON } from "./constants";
import { taskProgress } from "./tasks";

/** The survivor's current task and health: first on every screen, so it is never out of sight. */
export function Survivor(props: {
  state: GameState;
  frame: number;
  onStop: () => void;
  /** Extra actions below Stop Task, such as settings. */
  extraActions?: ComponentProps<typeof ActionPanel>["children"];
}) {
  const { state } = props;
  const task = state.activeTask ? TASK_BY_ID[state.activeTask] : undefined;
  const hpFraction = state.hp / maxHp(state);

  return (
    <List.Section title="Survivor">
      <List.Item
        title={task ? task.name : "Idle"}
        subtitle={
          task
            ? undefined
            : state.stats.cycles === 0
              ? "Start with Salvaging: Scavenge Hull Scrap"
              : "Pick a skill to get to work"
        }
        icon={task ? SKILL_ICON[task.skill] : Icon.Pause}
        accessories={[{ text: `${Math.floor(state.hp)}/${maxHp(state)} HP` }]}
        detail={
          <List.Item.Detail
            markdown={[
              artMarkdown(state.activeTask, props.frame, true),
              `# ${task ? task.name : "Idle"}`,
              task ? taskProgress(state, task) : "_You are stranded. Choose a skill below._",
              "",
              "```",
              `HP  ${bar(hpFraction)} ${Math.floor(state.hp)}/${maxHp(state)}`,
              "```",
              `Rations: **${count(state, "ration")}** · Credits: **${formatCredits(state.credits)}**${state.board.refreshAt ? ` · ${formatMarks(state.marks)}` : ""}`,
              ...formatBuffs(state).map((line) => `Buff: **${line}**`),
              ...(state.board.active
                ? [
                    "",
                    `Bounty: hunt ${state.board.active.bounty.count}× ${bountyTarget(state.board.active.bounty).monster?.name} (${state.board.active.progress}/${state.board.active.bounty.count})`,
                  ]
                : []),
              `Auto-eat: **${EAT_LEVELS.find(([v]) => v === state.settings.eatBelow)?.[1] ?? "Custom"}**, **${state.settings.foodPriority}** food first`,
            ].join("\n")}
          />
        }
        actions={
          <ActionPanel>
            {task && <Action title="Stop Task" icon={Icon.Stop} onAction={props.onStop} />}
            {props.extraActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
