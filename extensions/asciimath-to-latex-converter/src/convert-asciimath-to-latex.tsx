import { getPreferenceValues } from "@raycast/api";
import MathToLatexLivePanel from "./components/MathToLatexLivePanel";
import { WrapStyle } from "./components/MathToLatexLivePanel"; // Assuming WrapStyle is exported

interface Preferences {
  defaultWrapLatex: WrapStyle; // Changed from boolean to WrapStyle
}

export default function MathToLatexCommand() {
  // Type assertion ensures we get the correct type from preferences
  const { defaultWrapLatex } = getPreferenceValues<Preferences>();
  return <MathToLatexLivePanel defaultWrapLatex={defaultWrapLatex} />;
}
