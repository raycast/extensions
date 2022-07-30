import { useSummary } from "./hooks";

import { MenuBarExtra } from "@raycast/api";

export default function Command() {
  const summary = useSummary();

  return (
    <MenuBarExtra
      icon="../assets/icon.png"
      title={`Today: ${summary.data
        ?.map(([key, range]) => key === "Today" && range.cummulative_total.text)
        .filter((item) => item)}`}
      isLoading={summary.isLoading}
    ></MenuBarExtra>
  );
}
