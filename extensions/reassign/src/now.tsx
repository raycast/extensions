import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getScheduleRange, writeEvents } from "./lib/api";
import { batchFailure } from "./lib/envelope";
import { addDaysISO, clockPart, humanDuration, localMinutesBetween, todayISO } from "./lib/format";
import { maybeNotifyTransitions } from "./lib/notify";
import { signOut } from "./lib/oauth";
import {
  buildMenuBarModel,
  eventMeeting,
  kindLabel,
  Now,
  nowWallClock,
  resolveArea,
  ScheduleEvent,
  spanMinutes,
} from "./lib/schedule-model";
import { BILLING_URL, WEB_BASE, webDayUrl } from "./lib/wire";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate } = useCachedPromise(loadAroundToday, [todayISO()], {
    keepPreviousData: true,
  });

  // Fire block-transition notifications on each background tick.
  useEffect(() => {
    if (data?.ok && prefs.notifyTransitions) void maybeNotifyTransitions(data.data);
  }, [data, prefs.notifyTransitions]);

  if (!data || !data.ok) {
    const proBlocked = data && !data.ok && data.code === "permission";
    return (
      <MenuBarExtra icon={Icon.Circle} isLoading={isLoading} tooltip="Reassign">
        {data && !data.ok && ["signed_out", "unauthenticated", "unauthorized"].includes(data.code) && (
          <MenuBarExtra.Item
            title="Sign in to Reassign"
            icon={Icon.Key}
            onAction={async () => {
              try {
                await launchCommand({ name: "agenda", type: LaunchType.UserInitiated });
              } catch {
                await showHUD("Could not open Agenda. Open it from Raycast to sign in.");
              }
            }}
          />
        )}
        <MenuBarExtra.Item
          title={proBlocked ? "Reassign Pro required" : "Open Reassign"}
          onAction={() => open(proBlocked ? BILLING_URL : WEB_BASE)}
        />
        <MenuBarExtra.Item title="Refresh Now" onAction={revalidate} />
      </MenuBarExtra>
    );
  }

  const model = buildMenuBarModel(data.data);
  const backlogCount = data.data.backlogCount ?? 0;
  const todayIso = nowWallClock(data.data.now).date;
  const currentMeeting = model.current ? eventMeeting(model.current) : null;
  const { title, icon } = barTitle(model.current, model.upcoming[0], prefs.showBlockName);

  // Reflect the current block from the menu bar, then refresh. A HUD gives the
  // only feedback a menu-bar command can show.
  async function reflectCurrent(status: "kept" | "skipped") {
    if (!model.current) return;
    const result = await writeEvents([{ op: "reflect", id: model.current.id, status }]);
    // A 2xx can still carry a rejected row; do not report a false success.
    const failed = result.ok ? batchFailure(result.data)?.error : result;
    await showHUD(
      !failed
        ? status === "kept"
          ? "Checked off the block"
          : "Marked the block skipped"
        : `Could not update the block: ${failed.message}`,
    );
    const applied = !failed;
    if (applied) revalidate();
  }

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading} tooltip="Reassign">
      {model.current && (
        <MenuBarExtra.Section title="Now">
          <MenuBarExtra.Item
            title={model.current.name || "(untitled)"}
            subtitle={currentSubtitle(model.current, model.now)}
            onAction={() => launchCommand({ name: "agenda", type: LaunchType.UserInitiated })}
          />
          {currentMeeting && (
            <MenuBarExtra.Item
              title={currentMeeting.label ? `Join ${currentMeeting.label}` : "Join Meeting"}
              icon={Icon.Video}
              onAction={() => open(currentMeeting.url)}
            />
          )}
          {!model.current.readOnly && (
            <>
              <MenuBarExtra.Item
                title="Check off Kept"
                icon={Icon.CheckCircle}
                onAction={() => reflectCurrent("kept")}
              />
              <MenuBarExtra.Item
                title="Check off Skipped"
                icon={Icon.XMarkCircle}
                onAction={() => reflectCurrent("skipped")}
              />
            </>
          )}
          <MenuBarExtra.Item
            title="Open in Reassign"
            icon={Icon.Globe}
            onAction={() => open(webDayUrl(todayIso, model.current!.id))}
          />
        </MenuBarExtra.Section>
      )}
      {model.upcoming.length > 0 && (
        <MenuBarExtra.Section title="Up next">
          {model.upcoming.map((event) => (
            <MenuBarExtra.Item
              key={`${event.id}-${event.start}`}
              icon={{ source: Icon.Dot, tintColor: areaColor(event, model.areas) }}
              title={`${clockPart(event.start)}  ${event.name || "(untitled)"}`}
              onAction={() => launchCommand({ name: "agenda", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {model.other.length > 0 && (
        <MenuBarExtra.Section title="Also today">
          {model.other.map((event) => (
            <MenuBarExtra.Item
              key={`${event.id}-${event.start}`}
              icon={{ source: Icon.Dot, tintColor: areaColor(event, model.areas) }}
              title={`${clockPart(event.start)}  ${event.name || "(untitled)"}`}
              subtitle={kindLabel(event)}
              onAction={() => launchCommand({ name: "agenda", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {model.nextFree && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Free from ${clockPart(model.nextFree.start)} for ${humanDuration(spanMinutes(model.nextFree) ?? 0)}`}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Block…"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Agenda"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "agenda", type: LaunchType.UserInitiated })}
        />
        {backlogCount > 0 && (
          <MenuBarExtra.Item
            title={`Inbox (${backlogCount})`}
            icon={Icon.Tray}
            onAction={() => launchCommand({ name: "inbox", type: LaunchType.UserInitiated })}
          />
        )}
        <MenuBarExtra.Item title="Open Reassign" icon={Icon.Globe} onAction={() => open(WEB_BASE)} />
        <MenuBarExtra.Item title="Refresh Now" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openCommandPreferences} />
        <MenuBarExtra.Item
          title="Log Out"
          icon={Icon.Logout}
          onAction={async () => {
            await signOut();
            revalidate();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/** Build the static bar title. It never counts down (the bar re-renders on tick). */
function barTitle(
  current: ScheduleEvent | null,
  next: ScheduleEvent | undefined,
  showName: boolean,
): { title: string; icon: { source: Icon; tintColor: Color | string } } {
  if (current) {
    const until = clockPart(current.end);
    const label = showName ? `${current.name || "block"} · until ${until}` : `until ${until}`;
    return { title: label, icon: { source: Icon.CircleFilled, tintColor: Color.Green } };
  }
  if (next) {
    return {
      title: `Free until ${clockPart(next.start)}`,
      icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
    };
  }
  return {
    title: "Nothing planned",
    icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
  };
}

function areaColor(event: ScheduleEvent, areas: Parameters<typeof resolveArea>[1]): Color | string {
  return resolveArea(event, areas)?.color ?? Color.SecondaryText;
}

/** "until 14:30 · 23m left" for the current block. Recomputed each render. */
function currentSubtitle(event: ScheduleEvent, now: Now): string {
  const until = `until ${clockPart(event.end)}`;
  const left = localMinutesBetween(nowWallClock(now).local, event.end);
  return left !== null && left > 0 ? `${until} · ${humanDuration(left)} left` : until;
}

/**
 * Read the device day and its neighbours. The account timezone can put "today"
 * on another date than the device, and the model picks the day from `now`.
 */
function loadAroundToday(deviceDay: string) {
  return getScheduleRange(addDaysISO(deviceDay, -1), addDaysISO(deviceDay, 1));
}
