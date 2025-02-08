import { HarmonyCommand } from "./components/HarmonyCommand";
import { HarmonyProvider } from "./hooks/useHarmony";

export default function Command(): React.ReactElement {
  return (
    <HarmonyProvider>
      <HarmonyCommand />
    </HarmonyProvider>
  );
}
