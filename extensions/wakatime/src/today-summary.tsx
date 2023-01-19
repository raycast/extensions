import { useTodaySummary } from "./hooks";
import { getDuration } from "./utils";

import { MenuBarExtra } from "@raycast/api";

export default function Command() {
  const { data, isLoading } = useTodaySummary();
  const seconds = data?.cummulative_total.seconds;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon="../assets/icon.png"
      title={seconds === 0 ? "Are we coding today?" : `Today: ${getDuration(seconds)}`}
    />
  );
}
