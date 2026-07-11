import { useTodaySummary } from "./hooks";
import { getDuration } from "./utils";

import { Icon, MenuBarExtra } from "@raycast/api";

export default function Command() {
  const { data, isLoading } = useTodaySummary();

  if (data == null) {
    if (isLoading) return <MenuBarExtra isLoading icon="../assets/icon.png" title="Loading" />;
    return <MenuBarExtra isLoading={false} icon={Icon.Warning} title="Error" />;
  }

  const seconds = data.cumulative_total.seconds;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon="../assets/icon.png"
      title={seconds === 0 ? "Are we coding today?" : `Today: ${getDuration(seconds)}`}
    />
  );
}
