import SettingsForm from "./components/SettingsForm";
import GridLoadingView from "./components/GridLoadingView";
import { useSettings } from "./hooks/useSettings";

export default function Command() {
  const { settings, setSettings, reset, isLoading } = useSettings();

  // Loading
  if (isLoading || !settings) {
    return <GridLoadingView />;
  }

  // Default form view
  return <SettingsForm settings={settings} setSettings={setSettings} reset={reset} />;
}
