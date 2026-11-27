import { getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { awayLines, recordAway } from "./engine/away";
import { bountyTarget } from "./engine/bounty";
import { SKILL_BY_ID, TASK_BY_ID } from "./engine/data";
import { contactRemainingMs, count, levelOf, maxHp, startTask, stopTask, taskDurationMs } from "./engine/engine";
import { formatBuffs, formatCredits, formatDuration, formatReport, setCompactNumbers } from "./engine/format";
import { ripeCount } from "./engine/hydroponics";
import { notificationFor } from "./engine/notifications";
import { update } from "./engine/storage";
import { GameState, Report } from "./engine/types";
import { notify } from "./notify";

function announce({ state, report }: { state: GameState; report: Report }) {
  const message = notificationFor(report, state.settings);
  if (message && getPreferenceValues<Preferences.Ticker>().notifications) notify("Soren Idle", message);
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const result = await update(recordAway);
    setCompactNumbers(result.state.settings.compactNumbers);
    announce(result);
    return result;
  });

  const state = data?.state;
  const task = state?.activeTask ? TASK_BY_ID[state.activeTask] : undefined;
  // How far through the current cycle the task is. A resource node waiting to respawn shows as 0%.
  const progress =
    state && task ? Math.min(99, Math.floor((state.taskProgressMs / taskDurationMs(state, task)) * 100)) : 0;
  const title = state
    ? task
      ? `${SKILL_BY_ID[task.skill].name} ${levelOf(state, task.skill)} · ${progress}%`
      : "Idle"
    : undefined;
  const recent = (state?.recentTasks ?? []).filter((id) => id !== state?.activeTask && TASK_BY_ID[id]);

  async function switchTo(taskId: string) {
    let error: string | undefined;
    // The old task is advanced before the switch, so its report has to be kept rather than dropped.
    const result = await update((s, report) => {
      const started = startTask(recordAway(s, report), taskId);
      error = started.error;
      return started.state;
    });
    announce(result);
    if (error) await showFailureToast(error, { title: "Could not switch task" });
    revalidate();
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon="extension-icon.png" title={title} tooltip="Soren Idle">
      {state && (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title={task ? `${task.name} · ${progress}%` : "Idle"} />
            <MenuBarExtra.Item title={`HP ${Math.floor(state.hp)}/${maxHp(state)}`} />
            <MenuBarExtra.Item title={`Rations ${count(state, "ration")}`} />
            <MenuBarExtra.Item title={`Credits ${formatCredits(state.credits)}`} />
            {formatBuffs(state).map((line) => (
              <MenuBarExtra.Item key={line} title={line} />
            ))}
            {state.board.active && (
              <MenuBarExtra.Item
                title={`Bounty ${state.board.active.progress}/${state.board.active.bounty.count} ${bountyTarget(state.board.active.bounty).monster?.name}`}
              />
            )}
            {ripeCount(state) > 0 && <MenuBarExtra.Item title={`Hydroponics: ${ripeCount(state)} ready to harvest`} />}
            {contactRemainingMs(state) !== null && (
              <MenuBarExtra.Item title={`Locals arrive in ${formatDuration(contactRemainingMs(state) ?? 0)}`} />
            )}
          </MenuBarExtra.Section>
          {(data.report.stoppedReason ||
            data.report.completed ||
            data.report.notices.length > 0 ||
            data.report.bounties.length > 0 ||
            Object.keys(data.report.rare).length > 0 ||
            data.report.levelUps.length > 0) && (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item title={formatReport(data.report)} />
            </MenuBarExtra.Section>
          )}
          {state.unseen && awayLines(state.unseen).length > 0 && (
            <MenuBarExtra.Section>
              <MenuBarExtra.Submenu
                title={`Since you last looked (${formatDuration(state.unseen.elapsedMs)})`}
                icon={Icon.Clock}
              >
                {awayLines(state.unseen).map((line) => (
                  <MenuBarExtra.Item key={line} title={line} />
                ))}
              </MenuBarExtra.Submenu>
            </MenuBarExtra.Section>
          )}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open Soren Idle"
              icon={Icon.Rocket}
              onAction={async () => {
                try {
                  await launchCommand({ name: "play", type: LaunchType.UserInitiated });
                } catch (error) {
                  await showFailureToast(error, { title: "Could not open Soren Idle" });
                }
              }}
            />
            {recent.length > 0 && (
              <MenuBarExtra.Submenu title={task ? "Switch Task" : "Resume Task"} icon={Icon.ArrowRightCircle}>
                {recent.map((id) => (
                  <MenuBarExtra.Item
                    key={id}
                    title={`${SKILL_BY_ID[TASK_BY_ID[id].skill].name}: ${TASK_BY_ID[id].name}`}
                    onAction={() => switchTo(id)}
                  />
                ))}
              </MenuBarExtra.Submenu>
            )}
            {task && (
              <MenuBarExtra.Item
                title="Stop Task"
                icon={Icon.Stop}
                onAction={async () => {
                  await update(stopTask);
                  revalidate();
                }}
              />
            )}
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
