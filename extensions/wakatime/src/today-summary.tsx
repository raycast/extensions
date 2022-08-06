import { useTodaySummary } from "./hooks";
import { getDuration } from "./utils";

import { MenuBarExtra, getPreferenceValues } from "@raycast/api";

export default function Command() {
  const todaySummary = useTodaySummary();
  const preference = getPreferenceValues();
  const showAsksSentence = preference.showAsksSentence;

  function getTitle(): string | undefined {
    const { seconds } = todaySummary?.data?.cummulative_total ?? {};
    if (seconds == undefined) return;

    return seconds === 0 && showAsksSentence ? undefined : `Today: ${getDuration(seconds)}`;
  }

  return (
    <MenuBarExtra
      icon="../assets/icon.png"
      title={getTitle() || "Are we coding today?"}
      isLoading={todaySummary.isLoading}
    />
  );
}
