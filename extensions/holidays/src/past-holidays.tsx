import moment from "moment";
import GlobalHolidays from "./components/globalHolidays";

export default function PastHolidays() {
  return (
    <GlobalHolidays
      dateFilter={(holidayDate) => holidayDate.isBefore(moment().startOf("day"))}
      opts={{ reverse: true }}
    />
  );
}
