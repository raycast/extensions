import SettingsFrom from "./components/SettingsFrom";
import GridLoadingView from "./components/GridLoadingView";
import { useSettings } from "./hooks/useSettings";

export default function Command() {
  const { settings, setSettings, reset, isLoading } = useSettings();

  // Loading
  if (isLoading || !settings) {
    return <GridLoadingView />;
  }

  // Default form view
  return <SettingsFrom settings={settings} setSettings={setSettings} reset={reset} />;
}
