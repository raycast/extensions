import { Detail } from "@raycast/api";
import { useMemo } from "react";
import { CastActions } from "./components/CastActions";
import { Setup } from "./components/Onboarding";
import { useLiveClock } from "./hooks/useLiveClock";
import { useWeatherData } from "./hooks/useWeatherData";
import { useWeatherSettings } from "./hooks/useWeatherSettings";
import { castSceneNow, renderCastScene } from "./lib/cast";
import { renderLoadingCard, svgToMarkdown } from "./lib/svg";
import { styleFor } from "./lib/themes";
import { formatPlace } from "./lib/api";
import { escapeMarkdown } from "./lib/text";

/** Full-window markdown width for an image-only Detail. */
const SCENE_WIDTH = 660;

export default function Command() {
  const settings = useWeatherSettings();
  const { locations, active, units } = settings;
  const { forecast, airQuality, isLoading, error, revalidate } = useWeatherData(active, units, settings.forecastDays);
  // castSceneNow reads Date.now(), so `tick` is a dependency of the scene memo below.
  const tick = useLiveClock(revalidate);

  const aqi = airQuality?.current.us_aqi ?? undefined;
  const scene = useMemo(
    () => (forecast && active ? castSceneNow(forecast, active, settings.unitSymbol, aqi) : undefined),
    [forecast, active, settings.unitSymbol, aqi, tick],
  );
  const markdown = useMemo(() => {
    if (scene) return svgToMarkdown(renderCastScene(scene, SCENE_WIDTH, "now-"), "Cast right now");
    if (!active) return "";
    if (isLoading) {
      return svgToMarkdown(
        renderLoadingCard(
          formatPlace(active),
          "Cast is checking the sky…",
          styleFor(settings.theme, 0, true),
          SCENE_WIDTH,
        ),
        "Loading",
      );
    }
    return `## Cast couldn't check the sky\n\n${escapeMarkdown(error?.message ?? "Check your connection and try again.")}\n\nPress ⌘R to retry.`;
  }, [scene, isLoading, error, active, settings.theme]);

  if (locations.length === 0 || !active) {
    if (settings.isLoading) return <Detail isLoading markdown="" />;
    return <Setup settings={settings} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={scene ? `Cast — ${scene.conditionLabel}` : "Cast"}
      markdown={markdown}
      actions={<CastActions scene={scene} settings={settings} refresh={revalidate} />}
    />
  );
}
