import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { WeatherSettings } from "../hooks/useWeatherSettings";
import { GeoResult, Units, formatPlace } from "../lib/api";
import { THEME_INFO, themePreviewMarkdown } from "../lib/showcase";
import { ThemeId } from "../lib/themes";
import { LocationSearch } from "./LocationSearch";

/**
 * Shown when no locations are saved. Runs the full wizard on first use;
 * afterwards (e.g. the last city was removed) it only asks for a new city,
 * keeping the already-chosen units and theme.
 */
export function Setup(props: { settings: WeatherSettings }) {
  const s = props.settings;
  if (s.onboarded) {
    return (
      <LocationSearch
        navigationTitle="Choose a City"
        emptyTitle="No locations saved"
        emptyDescription="Search for a city to continue"
        onSelect={s.addLocation}
      />
    );
  }
  return <Onboarding onComplete={s.completeOnboarding} />;
}

function Onboarding(props: { onComplete: (location: GeoResult, units: Units, theme: ThemeId) => void }) {
  const [step, setStepState] = useState<"location" | "units" | "theme">("location");
  const [location, setLocation] = useState<GeoResult | null>(null);
  const [units, setUnits] = useState<Units>("celsius");
  // The search bar text survives when one List replaces another, so the city
  // query would keep filtering the next step's items. Control it and clear on
  // every step change.
  const [searchText, setSearchText] = useState("");

  const setStep = (next: "location" | "units" | "theme") => {
    setSearchText("");
    setStepState(next);
  };

  // Sixteen hero renders; the controlled search bar re-renders on every keystroke.
  const previews = useMemo(() => {
    if (!location) return {};
    const place = formatPlace(location);
    return Object.fromEntries(THEME_INFO.map((t) => [t.id, themePreviewMarkdown(t.id, place)]));
  }, [location]);

  if (step === "location" || !location) {
    return (
      <LocationSearch
        navigationTitle="Welcome — Step 1 of 3"
        emptyTitle="Welcome to Weather"
        emptyDescription="Start by searching for your city"
        onSelect={(geo) => {
          setLocation(geo);
          setStep("units");
        }}
      />
    );
  }

  if (step === "units") {
    const back = <Action title="Go Back" icon={Icon.ArrowLeft} onAction={() => setStep("location")} />;
    return (
      <List
        navigationTitle="Units — Step 2 of 3"
        searchBarPlaceholder={`Units for ${location.name}…`}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
        <List.Item
          title="Metric"
          subtitle="°C · km/h — most of the world"
          icon={Icon.Temperature}
          actions={
            <ActionPanel>
              <Action
                title="Use Metric"
                icon={Icon.Checkmark}
                onAction={() => {
                  setUnits("celsius");
                  setStep("theme");
                }}
              />
              {back}
            </ActionPanel>
          }
        />
        <List.Item
          title="Imperial"
          subtitle="°F · mph — United States"
          icon={Icon.Temperature}
          actions={
            <ActionPanel>
              <Action
                title="Use Imperial"
                icon={Icon.Checkmark}
                onAction={() => {
                  setUnits("fahrenheit");
                  setStep("theme");
                }}
              />
              {back}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Theme — Step 3 of 3"
      isShowingDetail
      searchBarPlaceholder="Pick a look…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {THEME_INFO.map((t) => (
        <List.Item
          key={t.id}
          title={t.title}
          subtitle={t.description}
          icon={Icon.Brush}
          detail={<List.Item.Detail markdown={previews[t.id]} />}
          actions={
            <ActionPanel>
              <Action
                title={`Use ${t.title}`}
                icon={Icon.Checkmark}
                onAction={() => props.onComplete(location, units, t.id)}
              />
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={() => setStep("units")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
