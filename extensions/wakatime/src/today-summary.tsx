import { useTodaySummary } from "./hooks";
import { getDuration } from "./utils";

import { MenuBarExtra, getPreferenceValues } from "@raycast/api";

export default function Command() {
  const todaySummary = useTodaySummary();
  const preference = getPreferenceValues();
  const showAsksSentence = preference.showAsksSentence;

  function getTitle(): string | undefined {
    const today = todaySummary.data;

    if (today === undefined) return;

    const cumulative_total = today.cummulative_total;
    const todayText = getDuration(cumulative_total.seconds);

    return cumulative_total.seconds === 0 && showAsksSentence ? undefined : `Today: ${todayText}`;
  }

  return (
    <MenuBarExtra
      icon="../assets/icon.png"
      title={getTitle() || "Are we coding today?"}
      isLoading={todaySummary.isLoading}
    />
  );
}
