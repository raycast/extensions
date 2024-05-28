import { List, getPreferenceValues } from "@raycast/api";
import { isAuthenticated } from "./api/api";
import { useEffect, useState } from "react";
import { AttendancePeriod, getAttendances } from "./api/attendances";
import { AttendanceList } from "./components/AttendanceList";
import { MONTHS } from "./utils/date";

export default function AttendancesCommand() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [attendances, setAttendances] = useState<AttendancePeriod[] | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [rerunFetchTrigger, setRerunFetchTrigger] = useState(true);
  const [isAuth, setIsAuth] = useState<boolean | undefined>(undefined);

  const paddedMonth = (selectedMonth + 1).toString().padStart(2, "0");

  useEffect(() => {
    async function fetchAttendances() {
      const isAuth_ = await isAuthenticated();
      setIsAuth(isAuth_);
      if (!isAuth_) {
        return;
      }
      const employeeNumber = getPreferenceValues().employeeNumber;
      const attendances = await getAttendances(employeeNumber, currentYear.toString(), paddedMonth);

      // sort from new to old attendances
      const sortedAttendances = attendances.sort((a, b) => {
        return Date.parse(b.date + " " + b.start_time) - Date.parse(a.date + " " + a.start_time);
      });

      setAttendances(sortedAttendances);
    }
    fetchAttendances();
  }, [selectedMonth, rerunFetchTrigger]);

  const isLoading = !attendances;

  // Still authenticating, show loading indicator
  if (isAuth === undefined) {
    return <List isLoading={true} />;
    // Authenticated
  } else if (isAuth) {
    // Now check whether all data is there to render
    if (!isLoading) {
      return (
        <AttendanceList
          attendances={attendances}
          defaultMonth={MONTHS[currentMonth]}
          selectedMonth={selectedMonth}
          onDropdownChange={(month: string) => setSelectedMonth(MONTHS.indexOf(month))}
          onRefresh={() => setRerunFetchTrigger(!rerunFetchTrigger)}
        ></AttendanceList>
      );
    } else {
      return <List isLoading={true}></List>;
    }
  } else {
    return <List />;
  }
}
