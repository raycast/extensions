import { getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { awayLines, recordAway } from "./engine/away";
import { bountyTarget } from "./engine/bounty";
import { SKILL_BY_ID, TASK_BY_ID } from "./engine/data";
import { contactRemainingMs, count, levelOf, maxHp, stopTask } from "./engine/engine";
import { formatBuffs, formatBundle, formatCredits, formatDuration, formatReport } from "./engine/format";
import { ripeCount } from "./engine/hydroponics";
import { update } from "./engine/storage";
import { notify } from "./notify";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const result = await update(recordAway);
    const { stoppedReason, completed, bounties } = result.report;
    const bounty = bounties.length
      ? `Bounty complete: +${bounties[0].marks} Marks`
      : Object.keys(result.report.rare).length
        ? `Rare find: ${formatBundle(result.report.rare)}`
        : undefined;
    if ((stoppedReason || completed || bounty) && getPreferenceValues<Preferences.Ticker>().notifications)
      notify("Soren Idle", stoppedReason ?? completed ?? bounty ?? "");
    return result;
  });

  const state = data?.state;
  const task = state?.activeTask ? TASK_BY_ID[state.activeTask] : undefined;
  const title = state ? (task ? `${SKILL_BY_ID[task.skill].name} ${levelOf(state, task.skill)}` : "Idle") : undefined;

  return (
    <MenuBarExtra isLoading={isLoading} icon="extension-icon.png" title={title} tooltip="Soren Idle">
      {state && (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title={task ? task.name : "Idle"} />
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
              onAction={() => launchCommand({ name: "play", type: LaunchType.UserInitiated })}
            />
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
