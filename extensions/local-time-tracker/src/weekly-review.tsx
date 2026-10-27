import { Action, ActionPanel, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { formatDuration } from "./lib/duration";
import type { PlanData } from "./lib/plan-model";
import { localDateKey } from "./lib/planning";
import { loadPlanData } from "./lib/plan-state";
import { createWeeklyReview, reviewWeekStart } from "./lib/weekly-review";
import { weeklyReviewBoardMarkdown } from "./lib/weekly-review-board";

export function WeeklyReviewAction({ date, onPop }: { date: string; onPop?: () => void }) {
  return (
    <Action.Push
      title="Open Weekly Review"
      icon={Icon.Calendar}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      target={<WeeklyReview initialDate={date} />}
      onPop={onPop}
    />
  );
}

function WeeklyReview({ initialDate }: { initialDate: string }) {
  const [week, setWeek] = useState(() => {
    const requested = reviewWeekStart(initialDate);
    const current = reviewWeekStart(localDateKey(new Date()));
    return requested > current ? current : requested;
  });
  const [data, setData] = useState<PlanData>();
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    let reading = false;
    setLoading(true);
    async function load() {
      if (reading) return;
      reading = true;
      try {
        const instant = new Date();
        const saved = await loadPlanData(localDateKey(instant));
        if (mounted) {
          setData(saved);
          setNow(instant);
          setError(undefined);
        }
      } catch (reason) {
        if (mounted) setError(reason instanceof Error ? reason.message : "Could not load weekly review");
      } finally {
        reading = false;
        if (mounted) setLoading(false);
      }
    }
    void load();
    const poll = setInterval(() => void load(), 3000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [revision]);
  const review = useMemo(() => data && createWeeklyReview(data, week, now), [data, week, now]);
  const today = localDateKey(now);
  function selectWeek(value: string) {
    const current = reviewWeekStart(localDateKey(new Date()));
    setWeek(value > current ? current : value);
  }
  const actions = (
    <ActionPanel>
      <Action
        title="Previous Week"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
        onAction={() => selectWeek(reviewWeekStart(week, -1))}
      />
      {week < reviewWeekStart(today) ? (
        <Action
          title="Next Week"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={() => selectWeek(reviewWeekStart(week, 1))}
        />
      ) : null}
      <Action
        title="This Week"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => selectWeek(reviewWeekStart(localDateKey(new Date())))}
      />
      <Action
        title="Refresh Weekly Review"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => setRevision((value) => value + 1)}
      />
    </ActionPanel>
  );
  const title = `Weekly Review · ${week}${review ? ` – ${review.end < today ? review.end : today} · ${formatDuration(review.seconds)} · ${review.completed} completed` : ""}`;
  return (
    <Detail
      isLoading={loading}
      navigationTitle={title}
      markdown={
        error
          ? `# Could Not Load Weekly Review\n\n${error.replace(/[\\`*_{}[\]()#+.!<>]/g, "\\$&")}`
          : review
            ? weeklyReviewBoardMarkdown(review, localDateKey(now), environment.appearance)
            : "Loading Weekly Review…"
      }
      actions={actions}
    />
  );
}
