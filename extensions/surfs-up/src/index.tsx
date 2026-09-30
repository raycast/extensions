import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import spots from "./data/spots.json";
import { spotFlags } from "./data/spotFlags";
import { Spot } from "./types/spot";
import { ForecastPanelInfo } from "./types/forecastPanelInfo";
import { Forecast } from "./types/forecast";
import { alphaSortPredicate } from "./utils/alphaSortPredicate";
import { checkForecast } from "./handlers/checkForecast";
import { closeForecast } from "./handlers/closeForecast";
import Mask = Image.Mask;

export default function Command() {
  const [forecastPanelMarkdown, setForecastPanelMarkdown] = useState<string>();
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastPanelInfo, setForecastPanelInfo] = useState<ForecastPanelInfo>({
    isShowing: false,
    spotId: 0,
  });
  const { data, isLoading } = useCachedPromise(
    () => new Promise<Spot[]>((resolve) => resolve(spots.sort(alphaSortPredicate)))
  );

  function onCloseForecast() {
    closeForecast(setForecastPanelInfo, setForecastPanelMarkdown);
  }

  function onCheckForecast(spot: Spot, when: keyof Forecast) {
    void checkForecast(spot, when, setIsLoadingForecast, setForecastPanelInfo, setForecastPanelMarkdown);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={forecastPanelInfo.isShowing}
      searchBarPlaceholder="Search for surfing spots"
    >
      {data &&
        data.map((spot) => {
          const isSpotSelected = forecastPanelInfo.spotId === spot.id;
          return (
            <List.Item
              key={String(spot.id)}
              title={spot.location}
              subtitle={`#${spot.id}`}
              icon={{
                source: `https://flagicons.lipis.dev/flags/4x3/${spotFlags[spot.location]}.svg`,
                mask: Mask.RoundedRectangle,
              }}
              {...(forecastPanelInfo.isShowing
                ? { detail: <List.Item.Detail isLoading={isLoadingForecast} markdown={forecastPanelMarkdown} /> }
                : {})}
              actions={
                <ActionPanel>
                  <Action title="Forecast for Today" onAction={() => onCheckForecast(spot, "today")} icon={Icon.Pin} />
                  {isSpotSelected && (
                    <Action
                      autoFocus={isSpotSelected}
                      title="Forecast for Tomorrow"
                      onAction={() => onCheckForecast(spot, "tomorrow")}
                      icon={Icon.Forward}
                    />
                  )}
                  {isSpotSelected && (
                    <Action
                      title="Forecast for After Tomorrow"
                      onAction={() => onCheckForecast(spot, "afterTomorrow")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      icon={Icon.ForwardFilled}
                    />
                  )}
                  {isSpotSelected && (
                    <Action
                      title="Close Forecast"
                      onAction={onCloseForecast}
                      style={Action.Style.Destructive}
                      icon={Icon.ChevronLeft}
                      shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "enter" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
