import { useEffect, useState } from "react";
import { Activity, Tracking } from "./types";
import { useCurrentTracking } from "./useCurrentTracking";
import { useActivities } from "./useActivities";

type State = {
  isLoading: boolean;
  markdown: string;
  note: string;
  activity?: Activity;
};

const noTracking = "No tracking is happening at the moment.";

export const useCurrenTrackingStatus = () => {
  const currentTracking = useCurrentTracking();
  const { tracking, updateTracking, isLoadingTracking, startTracking } = currentTracking;
  const { isLoadingActivities, activities } = useActivities();
  const [{ isLoading, note, markdown, activity }, setState] = useState<State>({
    isLoading: isLoadingTracking || isLoadingActivities,
    note: "",
    markdown: "",
  });

  const stopTracking = () =>
    currentTracking.stopTracking().then(() => setState(prev => ({ ...prev, activity: undefined })));

  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: isLoadingTracking || isLoadingActivities }));

    if (!isLoadingTracking && !isLoadingActivities && !tracking) {
      setState(prev => ({ ...prev, isLoading: false, markdown: noTracking }));
      return;
    }

    const activity = tracking && activities.find(a => a.id === tracking.activityId);

    tracking &&
      activity &&
      Promise.resolve(restoreNote(tracking))
        .then(note => ({ note, markdown: formatText(note, tracking, activity) }))
        .then(({ note, markdown }) => setState(prev => ({ ...prev, activity, note, markdown })));
  }, [tracking, activities, isLoadingTracking, isLoadingActivities]);

  return {
    presentation: { markdown, note, isLoading },
    data: { tracking, activity, activities },
    actions: { startTracking, stopTracking, updateTracking },
  };
};

const restoreNote = (tracking: Tracking) => {
  const text = tracking.note.tags.reduce(
    (acc, val) => acc.replace(`<{{|t|${val.id}|}}>`, "#" + val.label),
    tracking.note.text
  );

  return tracking.note.mentions.reduce((acc, val) => acc.replace(`<{{|t|${val.id}|}}>`, "@" + val.label), text);
};

const formatText = (note: string, tracking: Tracking, activity: Activity | undefined) => {
  const ms = Date.now() - new Date(tracking.startedAt + "Z").getTime();
  const appendNote = note ? `\n\n**Note**: ${note}` : "";

  return `You are tracking **${activity?.name}** for ${humanizeDuration(ms)}.${appendNote}`;
};

export const humanizeDuration = (ms: number) => {
  const secs = Math.floor(ms / 1000);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs - hours * 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return "less than a minute";
  }

  const arr = [];

  hours && arr.push(`${hours}h`);
  minutes && arr.push(`${minutes}m`);

  return arr.join(" ");
};
