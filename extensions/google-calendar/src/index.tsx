import { CalendarsList } from "./components/CalendarsList";
import { useGetUserCalendars } from "./hooks/useGetUserCalendars";

export default function Command() {
  const { data, isLoading } = useGetUserCalendars();
  return <CalendarsList calendars={data} isLoading={isLoading} />;
}
