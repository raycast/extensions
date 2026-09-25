import { LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo } from "react";
import { DayLogsList } from "./components/DayLogsList";
import { parseDateArgument } from "./shared/dates";

export default function Command(props: LaunchProps<{ arguments: Arguments.DailyLogList }>) {
  const { date, error } = useMemo(() => parseDateArgument(props.arguments.date), [props.arguments.date]);

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Invalid date", error);
    }
  }, [error]);

  return <DayLogsList initialDate={date} />;
}
