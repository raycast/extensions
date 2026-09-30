import { List } from "@raycast/api";
import sportInfo from "./utils/getSportInfo";
import getScoresAndSchedule from "./utils/getSchedule";
import DisplayScoresAndSchedule from "./templates/scores-and-schedule";

sportInfo.setSportAndLeague("racing", "f1");

const displaySchedule = () => {
  const { scheduleLoading } = getScoresAndSchedule();

  return (
    <List searchBarPlaceholder="Search for a race or circuit" isLoading={scheduleLoading}>
      <DisplayScoresAndSchedule />
    </List>
  );
};

export default displaySchedule;
