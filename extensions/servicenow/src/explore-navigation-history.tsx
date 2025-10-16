import NavigationHistory from "./components/NavigationHistory";
import NavigationHistoryFull from "./components/NavigationHistoryFull";
import useInstances from "./hooks/useInstances";

export default function ExploreNavigationHistory() {
  const { selectedInstance } = useInstances();
  const { full } = selectedInstance || {};

  return full == "true" ? <NavigationHistoryFull /> : <NavigationHistory />;
}
