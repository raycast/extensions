import { List } from "@raycast/api";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";

type ScheduleProps = {
  subtitle: string;
};

const Schedule = ({ subtitle }: ScheduleProps) => {
  const { data, isLoading } = useSchedule();

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`${subtitle.toUpperCase()} Schedule`}>
      {data?.map((day) => (
        <DayComponent key={day.date} day={day} />
      ))}
    </List>
  );
};

export default Schedule;
