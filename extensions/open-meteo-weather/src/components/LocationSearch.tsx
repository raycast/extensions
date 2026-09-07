import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { GeoResult, filterGeoResults, geocodeName, geocodeUrl } from "../lib/api";
import { asturiasScene, rainbowScene, raycastScene } from "../lib/cast";
import { CastWorld } from "./CastWorld";
import { SecretScene } from "./SecretScene";

export function LocationSearch(props: {
  onSelect: (place: GeoResult) => void;
  /** Pop the navigation stack after selecting (for pushed views). */
  popOnSelect?: boolean;
  navigationTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");
  const { pop } = useNavigation();

  const hasQuery = geocodeName(query).length >= 2;
  const { isLoading, data, error } = useFetch<{ results?: GeoResult[] }>(geocodeUrl(query), {
    execute: hasQuery,
    keepPreviousData: true,
    onError: () => {
      // Shown inline in the empty view instead of a toast.
    },
  });

  // keepPreviousData holds the last results while the query is too short; don't show them.
  const results = hasQuery ? filterGeoResults(data?.results ?? [], query) : [];

  // Easter eggs: certain "places" aren't on any map.
  const secret = query
    .toLowerCase()
    .replace(/[^a-z\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const foundCastWorld = /what can cast do|cast'?s? world/.test(secret);
  const foundRainbow = secret.includes("rainbow");
  const foundAsturias = /asturias|asturies|oviedo|uvieu|uviu/.test(secret);
  const foundRaycast = secret.includes("raycast");

  return (
    <List
      isLoading={isLoading}
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder="City, neighborhood, or postal code…"
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
    >
      <List.EmptyView
        icon={hasQuery && error ? Icon.ExclamationMark : Icon.Globe}
        title={
          hasQuery ? (error ? "Couldn't reach the geocoder" : "No matches") : (props.emptyTitle ?? "Type a place name")
        }
        description={
          hasQuery
            ? error
              ? error.message
              : 'Qualify with commas: "noe valley, california"'
            : (props.emptyDescription ?? "Cities, neighborhoods, or postal codes — by Open-Meteo")
        }
      />
      {results.map((geo) => (
        <List.Item
          key={geo.id}
          title={geo.name}
          subtitle={[geo.admin2, geo.admin1, geo.country].filter(Boolean).join(", ")}
          icon={Icon.Pin}
          accessories={geo.timezone ? [{ text: geo.timezone }] : undefined}
          actions={
            <ActionPanel>
              <Action
                title="Select Location"
                icon={Icon.Checkmark}
                onAction={() => {
                  props.onSelect(geo);
                  if (props.popOnSelect) pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {foundCastWorld && (
        <List.Item
          key="egg-cast-world"
          icon="weather-fox-icon.png"
          title="Cast heard you"
          subtitle="Step into his world — every scene he knows"
          actions={
            <ActionPanel>
              <Action.Push title="Open Cast's World" icon={Icon.Stars} target={<CastWorld />} />
            </ActionPanel>
          }
        />
      )}
      {foundRainbow && (
        <List.Item
          key="egg-rainbow"
          icon={Icon.Star}
          title="Somewhere over the rainbow…"
          subtitle="Cast knows the way"
          actions={
            <ActionPanel>
              <Action.Push
                title="Follow the Rainbow"
                icon={Icon.Star}
                target={
                  <SecretScene
                    make={rainbowScene}
                    footnote="You found a secret corner of Cast's world."
                    baseName="cast-rainbows-end"
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
      {foundAsturias && (
        <List.Item
          key="egg-asturias"
          icon="weather-fox-icon.png"
          title="¡Puxa Asturies!"
          subtitle="Cast keeps a bottle ready for this"
          actions={
            <ActionPanel>
              <Action.Push
                title="Pour a Culín"
                icon={Icon.Star}
                target={
                  <SecretScene
                    make={asturiasScene}
                    footnote="A proper culín, poured the Asturian way — under the orbayu, of course."
                    baseName="cast-escanciando"
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
      {foundRaycast && (
        <List.Item
          key="egg-raycast"
          icon="weather-fox-icon.png"
          title="⌘ Space"
          subtitle="Cast's favorite shortcut"
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Confetti"
                icon={Icon.Stars}
                target={
                  <SecretScene
                    make={raycastScene}
                    footnote="Cast ran his favorite command. Obviously."
                    baseName="cast-confetti"
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
