import { getGroups, getActivities, getEntries } from "../db";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "0m";
}

type Input = {
  /**
   * Group/project name
   */
  groupName?: string;
  /**
   * Activity/task name. Can be used alone to search across all groups.
   */
  activityName?: string;
  /**
   * Start date filter (YYYY-MM-DD)
   */
  startDate?: string;
  /**
   * End date filter (YYYY-MM-DD)
   */
  endDate?: string;
  /**
   * Set to true to include individual entries instead of just totals
   */
  includeEntries?: boolean;
};

/**
 * Get time tracking data. Returns groups, activities, or entries depending on params.
 */
export default async function tool(input: Input) {
  const groups = await getGroups();
  const activeGroups = groups.filter((g) => g.status === "active");

  const dateRange = {
    start: input.startDate || "all time",
    end: input.endDate || "all time",
  };

  const inDateRange = (date: string) =>
    (!input.startDate || date >= input.startDate) && (!input.endDate || date <= input.endDate);

  // Activity search across all groups
  if (input.activityName && !input.groupName) {
    const results: {
      groupTitle: string;
      time: string;
      hours: number;
      entries?: { date: string; duration: string }[];
    }[] = [];
    let totalSeconds = 0;

    for (const group of activeGroups) {
      const activities = await getActivities(group.uuid);
      const match = activities.find(
        (a) => a.title.toLowerCase() === input.activityName!.toLowerCase() && a.status === "active"
      );

      if (match) {
        const entries = await getEntries(match.uuid);
        let seconds = 0;
        const filteredEntries: { date: string; duration: string }[] = [];

        for (const e of entries) {
          if (inDateRange(e.date)) {
            seconds += e.duration;
            if (input.includeEntries) {
              filteredEntries.push({ date: e.date, duration: formatDuration(e.duration) });
            }
          }
        }

        if (seconds > 0) {
          const result: {
            groupTitle: string;
            time: string;
            hours: number;
            entries?: { date: string; duration: string }[];
          } = {
            groupTitle: group.title,
            time: formatDuration(seconds),
            hours: Math.round((seconds / 3600) * 100) / 100,
          };
          if (input.includeEntries) result.entries = filteredEntries;
          results.push(result);
          totalSeconds += seconds;
        }
      }
    }

    if (results.length === 0) {
      return { error: `Activity "${input.activityName}" not found` };
    }

    return {
      activityTitle: input.activityName,
      dateRange,
      totalTime: formatDuration(totalSeconds),
      totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
      byGroup: results,
    };
  }

  // No filters - list all groups
  if (!input.groupName) {
    const results: { title: string; time: string; hours: number }[] = [];
    let totalSeconds = 0;

    for (const group of activeGroups) {
      const activities = await getActivities(group.uuid);
      let seconds = 0;

      for (const activity of activities) {
        const entries = await getEntries(activity.uuid);
        for (const e of entries) {
          if (inDateRange(e.date)) seconds += e.duration;
        }
      }

      if (seconds > 0) {
        results.push({
          title: group.title,
          time: formatDuration(seconds),
          hours: Math.round((seconds / 3600) * 100) / 100,
        });
        totalSeconds += seconds;
      }
    }

    return {
      dateRange,
      totalTime: formatDuration(totalSeconds),
      totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
      groups: results.sort((a, b) => b.hours - a.hours),
    };
  }

  // Find specific group
  const group = activeGroups.find((g) => g.title.toLowerCase() === input.groupName!.toLowerCase());
  if (!group) {
    return { error: `Group "${input.groupName}" not found`, available: activeGroups.map((g) => g.title) };
  }

  const activities = await getActivities(group.uuid);
  const activeActivities = activities.filter((a) => a.status === "active");

  // Group + activity - show entries
  if (input.activityName) {
    const activity = activeActivities.find((a) => a.title.toLowerCase() === input.activityName!.toLowerCase());
    if (!activity) {
      return { error: `Activity "${input.activityName}" not found`, available: activeActivities.map((a) => a.title) };
    }

    const entries = await getEntries(activity.uuid);
    const filtered = entries.filter((e) => inDateRange(e.date));
    const totalSeconds = filtered.reduce((sum, e) => sum + e.duration, 0);

    return {
      groupTitle: group.title,
      activityTitle: activity.title,
      dateRange,
      totalTime: formatDuration(totalSeconds),
      totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
      entries: filtered.map((e) => ({ date: e.date, duration: formatDuration(e.duration) })),
    };
  }

  // Group only - show activities
  const results: { title: string; time: string; hours: number }[] = [];
  let totalSeconds = 0;

  for (const activity of activeActivities) {
    const entries = await getEntries(activity.uuid);
    let seconds = 0;
    for (const e of entries) {
      if (inDateRange(e.date)) seconds += e.duration;
    }

    if (seconds > 0) {
      results.push({
        title: activity.title,
        time: formatDuration(seconds),
        hours: Math.round((seconds / 3600) * 100) / 100,
      });
      totalSeconds += seconds;
    }
  }

  return {
    groupTitle: group.title,
    dateRange,
    totalTime: formatDuration(totalSeconds),
    totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
    activities: results.sort((a, b) => b.hours - a.hours),
  };
}
