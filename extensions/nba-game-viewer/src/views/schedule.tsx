import { List } from "@raycast/api";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";

const Schedue = () => {
  const { data, isLoading } = useSchedule();

  return (
    <List isLoading={isLoading}>
      {data?.map((day) => (
        <DayComponent key={day.date} day={day} />
      ))}
    </List>
  );
};

export default Schedue;
