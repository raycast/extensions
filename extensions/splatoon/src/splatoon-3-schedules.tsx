import { SchedulesList } from "./components/List";
import { useSplatoon3Schedules } from "./hooks/use-splatoon-3-schedules";

export default function Command() {
  const { data, isLoading } = useSplatoon3Schedules();

  return (
    <SchedulesList
      schedules={data ?? []}
      isLoading={isLoading}
      openInBrowserAction={{ title: "Open Splatoon3.ink", url: "https://splatoon3.ink" }}
    />
  );
}
