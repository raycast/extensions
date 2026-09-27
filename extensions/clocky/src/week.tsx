import { List, ActionPanel, Detail, Action, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getSessions, getTargetConfig, getVacationDays, toggleVacationDay } from "./storage";
import {
  dayKey,
  formatDayLabel,
  formatDelta,
  getDaySummary,
  getVisibleWeekDays,
  msToClock,
  startOfWeek,
} from "./utils";
import { Session } from "./types";

export default function Command() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [targetHours, setTargetHours] = useState(8);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(5);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [now, setNow] = useState(new Date());
  const [referenceDate, setReferenceDate] = useState(new Date());
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const [all, target, vacations] = await Promise.all([getSessions(), getTargetConfig(), getVacationDays()]);
      if (!mounted) return;
      setSessions(all);
      setTargetHours(target.targetHours);
      setWorkDaysPerWeek(target.workDaysPerWeek);
      setVacationDays(vacations);
    };
    refresh();
    const refreshTimer = setInterval(refresh, 15000);
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => {
      mounted = false;
      clearInterval(refreshTimer);
      clearInterval(tick);
    };
  }, []);

  const nowIso = now.toISOString();
  const weekStart = startOfWeek(referenceDate, 1);
  const isCurrentWeek = weekStart.getTime() === startOfWeek(now, 1).getTime();
  const days = useMemo(() => {
    return getVisibleWeekDays(weekStart, workDaysPerWeek).map((day) => {
      const summary = getDaySummary(sessions, day, nowIso);
      const isVacation = vacationDays.includes(dayKey(day));
      const targetMs = isVacation ? 0 : targetHours * 3600 * 1000;
      const delta = summary.totals.net - targetMs;
      return { day, summary, delta, isVacation };
    });
  }, [sessions, targetHours, workDaysPerWeek, vacationDays, weekStart.getTime(), nowIso]);

  const goToPreviousWeek = () => {
    const previous = new Date(weekStart);
    previous.setDate(previous.getDate() - 7);
    setReferenceDate(previous);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setReferenceDate(next);
  };

  const weekNavigationActions = (
    <ActionPanel.Section>
      <Action title="Previous Week" icon={Icon.ArrowLeft} onAction={goToPreviousWeek} />
      <Action title="Next Week" icon={Icon.ArrowRight} onAction={goToNextWeek} />
    </ActionPanel.Section>
  );

  const weeklyTotals = days.reduce(
    (acc, d) => ({
      work: acc.work + d.summary.totals.work,
      breaks: acc.breaks + d.summary.totals.breaks,
      net: acc.net + d.summary.totals.net,
    }),
    { work: 0, breaks: 0, net: 0 },
  );
  const vacationCount = days.filter((d) => d.isVacation).length;
  const weeklyTarget = Math.max(0, targetHours * (workDaysPerWeek - vacationCount) * 3600 * 1000);
  const weeklyDelta = weeklyTotals.net - weeklyTarget;

  const toggleVacation = async (day: Date) => {
    const updated = await toggleVacationDay(dayKey(day));
    setVacationDays(updated);
  };

  const sectionTitle = isCurrentWeek
    ? `Week - ${msToClock(weeklyTotals.net)} net`
    : `Week of ${formatDayLabel(weekStart)} - ${msToClock(weeklyTotals.net)} net`;

  return (
    <List>
      <List.Section
        title={sectionTitle}
        subtitle={`Work ${msToClock(weeklyTotals.work)} | Breaks ${msToClock(weeklyTotals.breaks)} | Delta ${formatDelta(weeklyDelta)}`}
      >
        {days.map((d) => (
          <List.Item
            key={d.day.toISOString()}
            title={formatDayLabel(d.day)}
            accessories={[
              ...(d.isVacation ? [{ text: "Vacation" }] : []),
              { text: msToClock(d.summary.totals.net) },
              { text: formatDelta(d.delta) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Details"
                    target={
                      <Detail
                        markdown={`# ${formatDayLabel(d.day)}\n\nWork: ${msToClock(d.summary.totals.work)}\nBreaks: ${msToClock(
                          d.summary.totals.breaks,
                        )}\nNet: ${msToClock(d.summary.totals.net)}\nTarget: ${d.isVacation ? "0 (Vacation)" : msToClock(targetHours * 3600 * 1000)}\nDelta: ${formatDelta(d.delta)}`}
                      />
                    }
                  />
                  <Action
                    title={d.isVacation ? "Remove Vacation Day" : "Mark Vacation Day"}
                    onAction={() => toggleVacation(d.day)}
                  />
                </ActionPanel.Section>
                {weekNavigationActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
