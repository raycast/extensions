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
import { eventsBatch, getSchedule } from "./lib/api";
import { humanDuration, todayISO } from "./lib/format";
import { maybeNotifyTransitions } from "./lib/notify";
import { signOut } from "./lib/oauth";
import {
  buildMenuBarModel,
  eventMeeting,
  eventRange,
  kindLabel,
  minutesFromClock,
  Now,
  resolveArea,
  ScheduleEvent,
} from "./lib/schedule-model";
import { BILLING_URL, WEB_BASE, webDayUrl } from "./lib/wire";

interface Prefs {
  showBlockName: boolean;
  notifyTransitions: boolean;
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const { data, isLoading, revalidate } = useCachedPromise(
    (date: string) => getSchedule(date, true),
    [todayISO()],
    {
      keepPreviousData: true,
    },
  );

  // Fire block-transition notifications on each background tick.
  useEffect(() => {
    if (data?.ok && prefs.notifyTransitions) void maybeNotifyTransitions(data.data);
  }, [data, prefs.notifyTransitions]);

  if (!data || !data.ok) {
    const proBlocked = data && !data.ok && data.code === "permission";
    return (
      <MenuBarExtra icon={Icon.Circle} isLoading={isLoading} tooltip="Reassign">
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
  const todayIso = data.data.now.todayIso;
  const currentMeeting = model.current ? eventMeeting(model.current) : null;
  const { title, icon } = barTitle(model.current, model.upcoming[0], prefs.showBlockName);

  // Reflect the current block from the menu bar, then refresh. A HUD gives the
  // only feedback a menu-bar command can show.
  async function reflectCurrent(status: "kept" | "skipped") {
    if (!model.current) return;
    const result = await eventsBatch([{ op: "reflect", id: model.current.id, status }]);
    // A 2xx can still carry a rejected row (failed:1); do not report a false success.
    const applied = result.ok && result.data.failed === 0;
    await showHUD(
      applied
        ? status === "kept"
          ? "Checked off the block"
          : "Marked the block skipped"
        : "Could not update the block",
    );
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
              title={`${event.start}  ${event.name || "(untitled)"}`}
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
              title={`${event.start}  ${event.name || "(untitled)"}`}
              subtitle={kindLabel(event)}
              onAction={() => launchCommand({ name: "agenda", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {model.nextFree && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Free from ${model.nextFree.start} for ${humanDuration(model.nextFree.durationMinutes)}`}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Schedule a Block…"
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
        <MenuBarExtra.Item
          title="Open Reassign"
          icon={Icon.Globe}
          onAction={() => open(WEB_BASE)}
        />
        <MenuBarExtra.Item title="Refresh Now" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item
          title="Preferences…"
          icon={Icon.Gear}
          onAction={openCommandPreferences}
        />
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
    const label = showName
      ? `${current.name || "block"} · until ${current.end}`
      : `until ${current.end}`;
    return { title: label, icon: { source: Icon.CircleFilled, tintColor: Color.Green } };
  }
  if (next) {
    return {
      title: `Free until ${next.start}`,
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
  const nowMinutes = minutesFromClock(now.currentClock);
  const range = eventRange(event);
  if (nowMinutes === null || !range) return `until ${event.end}`;
  const left = range.end - nowMinutes;
  return left > 0 ? `until ${event.end} · ${humanDuration(left)} left` : `until ${event.end}`;
}
