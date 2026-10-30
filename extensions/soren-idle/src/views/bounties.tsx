import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { ABANDON_COST, BOARD_BONUS, REROLL_COST } from "../engine/data";
import { boardCapacity, boardLevel, bountyLevel, bountyTarget, xpForBountyLevel } from "../engine/bounty";
import { bar, formatDuration, formatMarks } from "../engine/format";
import { taskDurationMs } from "../engine/engine";
import { Bounty, GameState } from "../engine/types";
import { Notice } from "./notice";

const TIER_NAMES = ["Easy", "Hard", "Deadly"];

function bountyMarkdown(state: GameState, bounty: Bounty, progress?: number): string {
  const task = bountyTarget(bounty);
  const huntTime = taskDurationMs(state, task) * (bounty.count - (progress ?? 0));
  return [
    `# Hunt ${bounty.count}× ${task.monster?.name}`,
    `> ${bounty.line}`,
    `> — ${bounty.poster}`,
    "",
    ...(progress !== undefined
      ? [
          "```",
          `${bar(progress / bounty.count)} ${progress}/${bounty.count}`,
          "```",
          "Kills only count while you are on the matching hunt.",
          "",
        ]
      : []),
    `- **Hunt:** ${task.name} (Combat ${task.levelReq})`,
    `- **Tier:** ${TIER_NAMES[bounty.tier - 1]}`,
    `- **Pays:** ${formatMarks(bounty.marks)} and ${bounty.xp} bounty XP`,
    `- **Time:** about ${formatDuration(huntTime)} of hunting`,
  ].join("\n");
}

export function Bounties(props: {
  state: GameState;
  onAccept: (id: number, start: boolean) => void;
  onAbandon: () => void;
  onReroll: () => void;
  onHunt: (taskId: string) => void;
}) {
  const { state } = props;
  const level = boardLevel(state);

  if (level === 0) {
    return (
      <Notice
        icon={Icon.Flag}
        title="No Bounty Board"
        description="Build a Bounty Board in Base once you can talk to the locals."
      />
    );
  }

  const active = state.board.active;
  const next = xpForBountyLevel(bountyLevel(state) + 1);
  const floor = xpForBountyLevel(bountyLevel(state));
  const reroll = (
    <Action
      title={`Reroll Board (${REROLL_COST} Marks)`}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={props.onReroll}
    />
  );

  return (
    <>
      <List.Section title="Bounties" subtitle={`Bounty level ${bountyLevel(state)} · ${formatMarks(state.marks)}`}>
        {active ? (
          <List.Item
            title={`Hunt ${active.bounty.count}× ${bountyTarget(active.bounty).monster?.name}`}
            icon={{ source: Icon.Flag, tintColor: Color.Green }}
            accessories={[{ text: `${active.progress}/${active.bounty.count}` }]}
            detail={<List.Item.Detail markdown={bountyMarkdown(state, active.bounty, active.progress)} />}
            actions={
              <ActionPanel>
                {state.activeTask !== active.bounty.task && (
                  <Action title="Start Hunt" icon={Icon.Play} onAction={() => props.onHunt(active.bounty.task)} />
                )}
                <Action
                  title={`Abandon Bounty (${ABANDON_COST} Marks)`}
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={props.onAbandon}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            title="No active bounty"
            subtitle="Accept one from the board"
            icon={Icon.Flag}
            detail={
              <List.Item.Detail
                markdown={[
                  "# Bounty level " + bountyLevel(state),
                  "```",
                  `${bar(next > floor ? (state.bountyXp - floor) / (next - floor) : 1)} ${state.bountyXp}/${next} XP`,
                  "```",
                  `The board pays ${Math.round((BOARD_BONUS[level - 1] ?? 0) * 100)}% extra Marks.`,
                ].join("\n")}
              />
            }
          />
        )}
      </List.Section>
      <List.Section title="On the board" subtitle={`${state.board.offers.length}/${boardCapacity(state)}`}>
        {state.board.offers.map((bounty) => (
          <List.Item
            key={bounty.id}
            title={`Hunt ${bounty.count}× ${bountyTarget(bounty).monster?.name}`}
            subtitle={bounty.poster}
            icon={Icon.Flag}
            accessories={[
              { tag: { value: formatMarks(bounty.marks), color: Color.Orange } },
              { tag: TIER_NAMES[bounty.tier - 1] },
            ]}
            detail={<List.Item.Detail markdown={bountyMarkdown(state, bounty)} />}
            actions={
              <ActionPanel>
                {!active && (
                  <>
                    <Action
                      title="Accept and Start Hunt"
                      icon={Icon.Play}
                      onAction={() => props.onAccept(bounty.id, true)}
                    />
                    <Action title="Accept Only" icon={Icon.Check} onAction={() => props.onAccept(bounty.id, false)} />
                  </>
                )}
                {reroll}
              </ActionPanel>
            }
          />
        ))}
        {state.board.offers.length === 0 && (
          <List.Item
            title="Nothing posted right now"
            subtitle={`Finish a bounty or wait for the board to refresh`}
            icon={Icon.Clock}
          />
        )}
      </List.Section>
    </>
  );
}
