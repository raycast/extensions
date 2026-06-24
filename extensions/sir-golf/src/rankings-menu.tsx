// DORMANT — not registered as a command in package.json for this release.
// Per sir.golf doc 10 §6b, the menu-bar surface is the weakest golf form factor
// and is intended only as a seasonal Majors/Ryder Cup marketing skin. To relaunch,
// re-add a { "name": "rankings-menu", "mode": "menu-bar", ... } entry to `commands`.
import {
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  ScheduleEntry,
  TourId,
  WATCH_GUIDE,
  formatDateRange,
  getLeaderboard,
  getSeason,
  getSeasonLeaders,
  tourTitle,
} from "./espn";

interface Prefs {
  defaultTour?: TourId;
}

async function loadMenu(tour: TourId) {
  const year = new Date().getFullYear();
  const [board, season, scoring, fedex] = await Promise.all([
    getLeaderboard(tour),
    getSeason(tour, year),
    getSeasonLeaders(tour, "scoringAverage", 5),
    getSeasonLeaders(tour, "cupPoints", 5),
  ]);
  return { board, season, scoring, fedex };
}

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || full;
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const tour: TourId = prefs.defaultTour ?? "pga";
  const { data, isLoading } = useCachedPromise(loadMenu, [tour], {
    keepPreviousData: true,
  });

  const board = data?.board;
  const isLive = !!board?.isLive;

  // The tournament to feature: a live/in-progress one, else the next upcoming.
  const entries = data?.season.entries ?? [];
  const upNext: ScheduleEntry | undefined =
    entries.find((e) => e.state === "current") ??
    entries.find((e) => e.state === "upcoming");

  // Menu-bar visual is always the golf emoji; append the live leader when one
  // is playing so you can glance the leader without opening the menu.
  const leader = isLive ? board?.players?.[0] : undefined;
  const title = leader ? `🏌️ ${leader.total} ${lastName(leader.player)}` : "🏌️";

  const tooltip = isLive
    ? `${board?.eventName} · live`
    : upNext
      ? `Up next: ${upNext.name}`
      : "Golf";

  const watch = WATCH_GUIDE[tour] ?? [];

  return (
    <MenuBarExtra title={title} tooltip={tooltip} isLoading={isLoading}>
      {isLive ? (
        <MenuBarExtra.Section title={`🔴 ${board?.eventName ?? "Live"}`}>
          {(board?.players ?? []).slice(0, 5).map((p, i) => (
            <MenuBarExtra.Item
              key={`t-${i}`}
              title={`${p.position}  ${p.player}`}
              subtitle={`  ${p.total}${p.thru && p.thru !== "—" ? ` · ${p.thru}` : ""}`}
              onAction={() =>
                board?.espnUrl ? open(board.espnUrl) : undefined
              }
            />
          ))}
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="This Week">
          {upNext ? (
            <>
              <MenuBarExtra.Item
                title={upNext.name}
                subtitle={`  ${formatDateRange(upNext.startDate, upNext.endDate)}`}
                onAction={() =>
                  launchCommand({
                    name: "golf-season",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
              {watch.slice(0, 2).map((w) => (
                <MenuBarExtra.Item
                  key={w.region}
                  icon={Icon.Livestream}
                  title={`Watch · ${w.region}`}
                  subtitle={`  ${w.networks}`}
                />
              ))}
            </>
          ) : (
            <MenuBarExtra.Item title="No tournament scheduled" />
          )}
        </MenuBarExtra.Section>
      )}

      {/* When not live, surface the most recent result too. */}
      {!isLive && board?.isMostRecent && (board?.players?.length ?? 0) > 0 && (
        <MenuBarExtra.Section title={`${board?.eventName} · final`}>
          {(board?.players ?? []).slice(0, 3).map((p, i) => (
            <MenuBarExtra.Item
              key={`r-${i}`}
              title={`${p.position}  ${p.player}`}
              subtitle={`  ${p.total}`}
              onAction={() =>
                board?.espnUrl ? open(board.espnUrl) : undefined
              }
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Scoring Average">
        {(data?.scoring.rows ?? []).map((r) => (
          <MenuBarExtra.Item
            key={`s-${r.rank}`}
            title={`${r.rank}.  ${r.name}`}
            subtitle={`  ${r.value}`}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="FedEx Cup">
        {(data?.fedex.rows ?? []).map((r) => (
          <MenuBarExtra.Item
            key={`f-${r.rank}`}
            title={`${r.rank}.  ${r.name}`}
            subtitle={`  ${r.value}`}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Open Leaderboard (${tourTitle(tour)})`}
          icon={Icon.AppWindowList}
          onAction={() =>
            launchCommand({
              name: "leaderboard",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Golf Season"
          icon={Icon.Calendar}
          onAction={() =>
            launchCommand({
              name: "golf-season",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
