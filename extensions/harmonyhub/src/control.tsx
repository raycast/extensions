import React from "react";

import { HarmonyProvider } from "./hooks/useHarmony";
import { HarmonyCommand } from "./ui/components/views/HarmonyCommand";

export default function Command(): React.ReactElement {
  return (
    <HarmonyProvider>
      <HarmonyCommand />
    </HarmonyProvider>
  );
}
