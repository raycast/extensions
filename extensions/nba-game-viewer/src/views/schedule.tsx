import { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { Day } from "../schedule.types";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";

const Schedue = () => {
  const [loading, setLoading] = useState<boolean>(true);

  const schedule = useSchedule();

  useEffect(() => {
    if (schedule) {
      setLoading(false);
    }
  }, [schedule]);

  return (
    <List isLoading={loading}>
      {schedule.map((day: Day) => (
        <DayComponent key={day.date} day={day} />
      ))}
    </List>
  );
};

export default Schedue;
