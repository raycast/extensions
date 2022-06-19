import { List, Toast, showToast } from "@raycast/api";
import { Day } from "../types/schedule.types";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";

const Schedue = () => {
  const data = useSchedule();

  if (data.error) {
    showToast(Toast.Style.Failure, "Failed to get schedule");
    data.loading = false;
  }

  return (
    <List isLoading={data.loading}>
      {data.schedule.map((day: Day) => (
        <DayComponent key={day.date} day={day} />
      ))}
    </List>
  );
};

export default Schedue;
