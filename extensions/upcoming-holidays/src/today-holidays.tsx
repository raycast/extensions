import DateHoliday from "./components/dateHolidays";

export default function TodayHolidays() {
  return <DateHoliday selectedDate={new Date()} />;
}
