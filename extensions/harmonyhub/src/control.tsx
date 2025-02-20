import { getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";

import { HarmonyCommand, HarmonyStageType } from "./components/HarmonyCommand";
import { HarmonyProvider } from "./hooks/useHarmony";
import { HarmonyPreferences } from "./types/preferences";

export default function Command(): JSX.Element {
  const preferences = getPreferenceValues<HarmonyPreferences>();
  const [stage, setStage] = useState<HarmonyStageType>(preferences.defaultView || "activities");

  const handleStageChange = (newStage: HarmonyStageType) => {
    console.log("Changing stage to:", newStage);
    setStage(newStage);
  };

  return (
    <HarmonyProvider>
      <HarmonyCommand stage={stage} onStageChange={handleStageChange} />
    </HarmonyProvider>
  );
}
