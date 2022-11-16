import { useEffect, useState } from "react";
import { apiGetTimeTrackingEntries } from "./api-timeular";
import { Activity, ActivityReport, TimeEntry, Tracking } from "./types";
import { humanizeDuration } from "./useCurrenTrackingStatus";
import { date, showError } from "./utils";

export const useTodayReport = (tracking: Tracking | null, activity?: Activity) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [reportIsLoading, setReportIsLoading] = useState(true);
  const [reportMarkdown, setReportMarkdown] = useState("");

  useEffect(() => {
    const from = new Date(new Date().toDateString());
    const to = new Date(from.getTime() + 86400_000);

    apiGetTimeTrackingEntries({ from, to })
      .then(setEntries)
      .catch(showError)
      .finally(() => setReportIsLoading(false));
  }, [tracking]);

  useEffect(() => {
    if (reportIsLoading) {
      return;
    }

    const markStart = Date.now();

    Promise.resolve(tracking && activity ? entries.concat([mockEntry(tracking, activity)]) : entries)
      .then(entries => entries.reduce(groupByActivity, [] as TimeEntry[][]))
      .then(groupped => groupped.map(arr => arr.reduce(groupIntoReport, blankReport(arr[0].activity))))
      .then(entries => entries.sort((l, r) => (l.duration > r.duration ? -1 : 1)))
      .then(entries => entries.map(entry => `* ${entry.activity.name} for ${humanizeDuration(entry.duration)}`))
      .then(list => list.join("\n\n"))
      .then(markdown =>
        markdown
          ? setReportMarkdown("Time entries you have tracked today:\n" + markdown)
          : setReportMarkdown("You didn't track anything today yet.")
      )
      .finally(() => console.debug(`building today report took ${Date.now() - markStart}ms`));
  }, [reportIsLoading, entries, tracking, activity]);

  return { reportMarkdown, reportIsLoading };
};

const groupByActivity = (acc: TimeEntry[][], val: TimeEntry) => {
  const arr = acc.find(arr => arr[0].activity.id === val.activity.id);
  arr ? arr.push(val) : acc.push([val]);

  return acc;
};

const groupIntoReport = (acc: ActivityReport, val: TimeEntry) => {
  const stoppedAt = new Date(val.duration.stoppedAt + "Z").getTime();
  const startedAt = new Date(val.duration.startedAt + "Z").getTime();

  acc.duration += stoppedAt - startedAt;

  return acc;
};

const blankReport = (activity: Activity) => ({ activity, duration: 0 } as ActivityReport);
const mockEntry = ({ startedAt }: Tracking, activity: Activity) =>
  ({
    id: "",
    creator: "",
    activity,
    note: {},
    duration: {
      startedAt,
      stoppedAt: date(new Date()),
    },
  } as TimeEntry);
