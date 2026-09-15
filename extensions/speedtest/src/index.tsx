import { Cache, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SpeedtestDashboard } from "./components/dashboard";
import { SpeedtestList } from "./components/speedtest-list";
import { useSpeedtest } from "./lib/hooks";

type View = "meter" | "list";

// Cache is synchronous, so the last used view is known on the first render and
// the command opens straight into it without flashing the other one.
const cache = new Cache();
const VIEW_KEY = "view";

function loadView(): View {
  return cache.get(VIEW_KEY) === "list" ? "list" : "meter";
}

export default function Command() {
  const speedtest = useSpeedtest();
  const { result, error } = speedtest;
  const [view, setViewState] = useState<View>(loadView);

  const setView = (next: View) => {
    cache.set(VIEW_KEY, next);
    setViewState(next);
  };

  useEffect(() => {
    const message = error ?? result.error;
    if (message) {
      showToast({ style: Toast.Style.Failure, title: "Speedtest failed", message });
    }
  }, [error, result.error]);

  // Failures use the original list view so the error window stays the same as before.
  if (view === "list" || result.error) {
    return <SpeedtestList {...speedtest} showMeter={() => setView("meter")} />;
  }
  return <SpeedtestDashboard {...speedtest} showList={() => setView("list")} />;
}
