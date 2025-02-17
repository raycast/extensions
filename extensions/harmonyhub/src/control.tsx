import { useState } from "react";

import { HarmonyCommand, HarmonyStageType } from "./components/HarmonyCommand";
import { HarmonyProvider } from "./hooks/useHarmony";

export default function Command(): JSX.Element {
  const [stage, setStage] = useState<HarmonyStageType>("activities");

  return (
    <HarmonyProvider>
      <HarmonyCommand stage={stage} onStageChange={setStage} />
    </HarmonyProvider>
  );
}
