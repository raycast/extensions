import { Provider } from "u/context";
import Calendar from "@/calendar/calendar";

export default function Cron() {
  return (
    <Provider>
      <Calendar />
    </Provider>
  );
}
