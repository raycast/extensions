import { useSummary } from "./hooks";

import { MenuBarExtra, getPreferenceValues } from "@raycast/api";

export default function Command() {
  const summary = useSummary();
  const preference = getPreferenceValues();
  const asksSentence = preference.showAsksSentence;

  function getTitle(): string {
    return `${summary.data
      ?.map(
        ([key, range]) =>
          key === "Today" &&
          (range.cummulative_total.seconds === 0 && asksSentence
            ? asksSentence
            : `Today: ${range.cummulative_total.text}`)
      )
      .filter((item) => item)}`;
  }

  return <MenuBarExtra icon="../assets/icon.png" title={getTitle()} isLoading={summary.isLoading} />;
}
