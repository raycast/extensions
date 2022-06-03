import { List, Toast, showToast } from "@raycast/api";
import { Day } from "../types/schedule.types";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";

const Schedue = () => {
  let { schedule, loading, error } = useSchedule();

  if (error) {
    showToast(Toast.Style.Failure, "Failed to get roster");
    loading = false;
  }

  return (
    <List isLoading={loading}>
      {schedule.map((day: Day) => (
        <DayComponent key={day.date} day={day} />
      ))}
    </List>
  );
};

export default Schedue;
