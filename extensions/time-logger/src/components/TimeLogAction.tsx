import { Action, Icon, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";
import { generateCalendarURL } from "../utils";

import type { Preferences, InProgressEpicData } from "../types";

interface Props {
  workingOnEpic: InProgressEpicData | null;
  setWorkingOnEpic: (epicData: InProgressEpicData | null) => void;
}

export const TimeLogAction: React.FC<Props> = ({ workingOnEpic, setWorkingOnEpic }) => {
  const preferences = getPreferenceValues<Preferences>();

  if (!workingOnEpic?.workStartedTimestamp) return null;
  const startTime = new Date(workingOnEpic.workStartedTimestamp);
  const endTime = Date.now();
  const durationInMinutes = Math.floor((endTime - startTime.getTime()) / 1000 / 60);
  const url = generateCalendarURL({
    title: workingOnEpic.name,
    startDate: startTime.getTime(),
    endDate: endTime,
    templateEventUrl: preferences.templateEventUrl,
  });

  const showWorkingTime = async () => showHUD(`You have worked for ${durationInMinutes} minutes`);

  const saveWork = async () => {
    if (!workingOnEpic?.workStartedTimestamp) {
      showToast({
        title: "Failed to record time",
        style: Toast.Style.Failure,
      });
      return null;
    } else {
      open(url);
      setWorkingOnEpic(null);
      await showWorkingTime();
    }
  };

  return (
    <>
      <Action
        key="log-time"
        onAction={saveWork}
        icon={Icon.StopFilled}
        title="Finish Working (Record Time)"
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
    </>
  );
};
