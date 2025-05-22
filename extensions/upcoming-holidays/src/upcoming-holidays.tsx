import moment from "moment";
import GlobalHolidays from "./components/globalHolidays";
import { useCallback } from "react";

export default function UpcomingHolidays() {
  const dateFilter = useCallback((holidayDate: moment.Moment) => {
    return holidayDate.isAfter(moment().startOf("day"));
  }, []);

  return <GlobalHolidays dateFilter={dateFilter} />;
}
