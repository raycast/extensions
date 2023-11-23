import { setAutoQuitAppsHook } from "./hooks/hooks";
import { useState } from "react";
import { layout } from "./types/preferences";
import { AutoQuitAppListLayout } from "./components/auto-quit-app-list-layout";
import { AutoQuitAppGridLayout } from "./components/auto-quit-app-grid-layout";

export default function SetAutoQuitApp() {
  const [refresh, setRefresh] = useState<number>(0);
  const { quitApps, disQuitApps, loading } = setAutoQuitAppsHook(refresh);

  return layout === "List" ? (
    <AutoQuitAppListLayout quitApp={quitApps} disQuitApp={disQuitApps} setRefresh={setRefresh} loading={loading} />
  ) : (
    <AutoQuitAppGridLayout quitApp={quitApps} disQuitApp={disQuitApps} setRefresh={setRefresh} loading={loading} />
  );
}
