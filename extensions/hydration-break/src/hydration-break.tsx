import {
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
  updateCommandMetadata,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { EspnEvent, fetchEvent, isHalftime, minuteFromClock, scoreLine } from "./espn";
import { playCheer, playWhistle, popConfetti, showSystemNotification } from "./sound";
import {
  computeSchedule,
  dayStamp,
  FollowedMatch,
  getFollowedMatch,
  getGlasses,
  getSettings,
  liveBreakInfo,
  logGlass,
  reachedGoal,
  resetAll,
  resetGlasses,
  ScheduleState,
  Settings,
  shouldAlertBreak,
  unfollowMatch,
} from "./match";

type LivePhase = "pre" | "live" | "halftime" | "full" | "gone" | "error";

type LiveStatus = {
  phase: LivePhase;
  label: string;
  statusText: string;
  minute: number | null;
  half: 1 | 2 | null;
  score?: string;
  onBreak: boolean;
  breakMinutesLeft: number;
  minutesToNextBreak: number | null;
  activeBreakStart: number | null;
};

function resolveLive(event: EspnEvent | null, followed: FollowedMatch, breakDuration: number): LiveStatus {
  const base = {
    label: followed.label,
    minute: null,
    half: null,
    onBreak: false,
    breakMinutesLeft: 0,
    minutesToNextBreak: null,
    activeBreakStart: null,
  } satisfies Partial<LiveStatus>;

  if (!event) {
    return { ...base, phase: "gone", statusText: "Not on today's board" };
  }
  if (event.status.type.state === "pre") {
    return { ...base, phase: "pre", statusText: event.status.type.shortDetail };
  }
  if (event.status.type.state === "post") {
    return { ...base, phase: "full", statusText: "Full time", score: scoreLine(event) };
  }
  if (isHalftime(event)) {
    return { ...base, phase: "halftime", statusText: "Half-time", score: scoreLine(event) };
  }

  const minute = minuteFromClock(event.status.displayClock);
  const half: 1 | 2 = event.status.period >= 2 ? 2 : 1;
  if (minute === null) {
    return { ...base, phase: "live", half, statusText: event.status.type.shortDetail, score: scoreLine(event) };
  }
  const info = liveBreakInfo(minute, breakDuration);
  return {
    phase: "live",
    label: followed.label,
    statusText: event.status.type.shortDetail,
    minute,
    half,
    score: scoreLine(event),
    ...info,
  };
}

type MenuData =
  | { mode: "schedule"; settings: Settings; glasses: number; schedule: ScheduleState }
  | { mode: "live"; settings: Settings; glasses: number; live: LiveStatus };

/** Alert (notification + whistle) once per break — runs on the menu bar's 1-minute refresh. */
async function fireBreakAlert(settings: Settings, key: string, message: string) {
  if (!settings.alertOnBreak) return;
  if (!(await shouldAlertBreak(key))) return;
  showSystemNotification("Hydration Break 💧", message);
  playWhistle();
}

export default function HydrationBreakMenuBar() {
  const { data, isLoading, revalidate } = usePromise(async (): Promise<MenuData> => {
    const now = Date.now();
    const settings = getSettings();
    const glasses = await getGlasses(now);
    const followed = await getFollowedMatch();

    if (followed) {
      try {
        const event = await fetchEvent(followed.league, followed.id);
        const live = resolveLive(event, followed, settings.breakDuration);
        if (live.onBreak && live.activeBreakStart !== null) {
          await fireBreakAlert(
            settings,
            `live:${followed.id}:${live.activeBreakStart}`,
            `${followed.label} — ${live.activeBreakStart}'. Drink some water! 🥤`,
          );
        }
        await updateCommandMetadata({
          subtitle: live.onBreak
            ? "💧 Take a hydration break"
            : (liveScoreboard(live) ?? `Following ${followed.label}`),
        });
        return { mode: "live", settings, glasses, live };
      } catch {
        const live: LiveStatus = {
          phase: "error",
          label: followed.label,
          statusText: "Couldn't reach ESPN",
          minute: null,
          half: null,
          onBreak: false,
          breakMinutesLeft: 0,
          minutesToNextBreak: null,
          activeBreakStart: null,
        };
        await updateCommandMetadata({ subtitle: `Following ${followed.label} (offline)` });
        return { mode: "live", settings, glasses, live };
      }
    }

    const schedule = computeSchedule(now, settings);
    if (schedule.onBreak && schedule.currentBreakNumber !== null) {
      await fireBreakAlert(
        settings,
        `sched:${dayStamp(now)}:${schedule.currentBreakNumber}`,
        `Break ${schedule.currentBreakNumber} of ${schedule.totalBreaks} — drink some water! 🥤`,
      );
    }
    await updateCommandMetadata({
      subtitle: schedule.onBreak ? "💧 Take a hydration break" : `${glasses}/${settings.hydrationGoal} glasses today`,
    });
    return { mode: "schedule", settings, glasses, schedule };
  });

  const onBreak = data?.mode === "live" ? data.live.onBreak : (data?.schedule.onBreak ?? false);
  const goalReached = data ? data.glasses >= data.settings.hydrationGoal : false;
  const menuIcon = onBreak ? Icon.Raindrop : goalReached ? Icon.Trophy : Icon.SoccerBall;
  const openFollow = () => launchCommand({ name: "follow-match", type: LaunchType.UserInitiated });
  const menuTitle = onBreak ? "Take a hydration break" : data?.mode === "live" ? liveScoreboard(data.live) : undefined;

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={menuTitle}
      tooltip={
        onBreak ? "Hydration break — drink some water" : goalReached ? "Daily goal reached 🏆" : "Hydration Break"
      }
      isLoading={isLoading}
    >
      {data && (
        <>
          {data.mode === "schedule" ? <ScheduleSection schedule={data.schedule} /> : <LiveSection live={data.live} />}

          <MenuBarExtra.Section title="Hydration">
            <MenuBarExtra.Item
              icon={Icon.Droplets}
              title={`${data.glasses} / ${data.settings.hydrationGoal} glasses today`}
            />
            <MenuBarExtra.Item
              icon={Icon.Raindrop}
              title="I hydrated!"
              onAction={async () => {
                const now = Date.now();
                if (data.settings.playCheer) playCheer();
                const glasses = await logGlass(now);
                if (reachedGoal(glasses, data.settings.hydrationGoal)) await popConfetti();
                revalidate();
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Source">
            {data.mode === "live" ? (
              <>
                <MenuBarExtra.Item icon={Icon.SoccerBall} title="Switch live match…" onAction={openFollow} />
                <MenuBarExtra.Item
                  icon={Icon.Calendar}
                  title="Stop following (use daily schedule)"
                  onAction={async () => {
                    await unfollowMatch();
                    revalidate();
                  }}
                />
              </>
            ) : (
              <MenuBarExtra.Item icon={Icon.SoccerBall} title="Follow a live match…" onAction={openFollow} />
            )}
            <MenuBarExtra.Item icon={Icon.Gear} title="Settings…" onAction={openCommandPreferences} />
            <MenuBarExtra.Item
              icon={Icon.Trash}
              title="Reset today's glasses"
              onAction={async () => {
                await resetGlasses();
                revalidate();
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.Trash}
              title="Reset all data"
              onAction={async () => {
                await resetAll();
                revalidate();
              }}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}

function ScheduleSection({ schedule }: { schedule: ScheduleState }) {
  const renderBody = () => {
    if (schedule.onBreak) {
      return (
        <MenuBarExtra.Item
          icon={Icon.Raindrop}
          title={`💧 Hydration break ${schedule.currentBreakNumber} of ${schedule.totalBreaks}`}
          subtitle={`${schedule.breakMinutesLeft}m left · drink up!`}
        />
      );
    }
    if (schedule.allDone) {
      return <MenuBarExtra.Item icon={Icon.Trophy} title="🏆 All hydration breaks done for today" />;
    }
    if (schedule.beforeFirst) {
      return (
        <MenuBarExtra.Item
          icon={Icon.Clock}
          title={`🕐 First break at ${schedule.nextBreakAt}`}
          subtitle={`${schedule.minutesToNextBreak}' to kick-off`}
        />
      );
    }
    return (
      <MenuBarExtra.Item
        icon={Icon.Stopwatch}
        title={`⚽ Next break in ${schedule.minutesToNextBreak}' (${schedule.nextBreakAt})`}
        subtitle={`${schedule.breaksElapsed} of ${schedule.totalBreaks} breaks elapsed`}
      />
    );
  };

  return <MenuBarExtra.Section title="Today's hydration breaks">{renderBody()}</MenuBarExtra.Section>;
}

function LiveSection({ live }: { live: LiveStatus }) {
  return (
    <MenuBarExtra.Section title={`Live: ${live.label}`}>
      {live.onBreak ? (
        <MenuBarExtra.Item
          icon={Icon.Raindrop}
          title={`💧 Hydration break — ${live.minute}'`}
          subtitle={`~${live.breakMinutesLeft}m · drink up!`}
        />
      ) : (
        <MenuBarExtra.Item icon={iconForPhase(live.phase)} title={liveTitle(live)} subtitle={liveSubtitle(live)} />
      )}
    </MenuBarExtra.Section>
  );
}

/** Compact scoreboard for the menu bar: country abbreviations + live score + minute. */
function liveScoreboard(live: LiveStatus): string | undefined {
  const matchup = live.label.replace(" @ ", " v ");
  switch (live.phase) {
    case "live":
      return `${live.score ?? matchup}${live.minute !== null ? ` · ${live.minute}'` : ""}`;
    case "halftime":
      return live.score ? `HT · ${live.score}` : "Half-time";
    case "full":
      return live.score ? `FT · ${live.score}` : "Full time";
    case "pre":
      return matchup;
    default:
      return undefined;
  }
}

function iconForPhase(phase: LivePhase) {
  switch (phase) {
    case "live":
      return Icon.Stopwatch;
    case "pre":
      return Icon.Clock;
    case "halftime":
      return Icon.Mug;
    case "full":
      return Icon.Trophy;
    default:
      return Icon.ExclamationMark;
  }
}

function liveTitle(live: LiveStatus): string {
  switch (live.phase) {
    case "live":
      return `⚽ ${live.minute !== null ? `${live.minute}'` : "live"} — ${live.half === 1 ? "First" : "Second"} half`;
    case "pre":
      return `🕐 Kicks off soon`;
    case "halftime":
      return `☕ Half-time`;
    case "full":
      return `🏆 Full time`;
    default:
      return `⚠️ ${live.statusText}`;
  }
}

function liveSubtitle(live: LiveStatus): string | undefined {
  if (live.phase === "live") {
    const next = live.minutesToNextBreak !== null ? `next break in ${live.minutesToNextBreak}'` : "no more breaks";
    return live.score ? `${live.score} · ${next}` : next;
  }
  if (live.phase === "pre") return live.statusText;
  if (live.phase === "full" || live.phase === "halftime") return live.score;
  return undefined;
}
