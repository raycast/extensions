import { SchedulesList } from "./components/List";
import { useSplatoon2Schedules } from "./hooks/use-splatoon-2-schedules";

export default function Command() {
  const { data, isLoading } = useSplatoon2Schedules();

  return (
    <SchedulesList
      schedules={data ?? []}
      isLoading={isLoading}
      openInBrowserAction={{ title: "Open Splatoon2.ink", url: "https://splatoon2.ink" }}
    />
  );
}
