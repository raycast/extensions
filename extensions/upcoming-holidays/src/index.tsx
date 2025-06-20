import GlobalHolidays from "./components/globalHolidays";
import { useCallback } from "react";
import { isAfter, startOfDay } from "date-fns";

export default function UpcomingHolidays() {
  const dateFilter = useCallback((holidayDate: Date) => {
    return isAfter(holidayDate, startOfDay(new Date())); //
  }, []);

  return <GlobalHolidays dateFilter={dateFilter} />;
}
