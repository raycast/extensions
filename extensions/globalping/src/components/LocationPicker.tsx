import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useDeferredValue, useMemo, useState } from "react";
import { useLocationDirectory } from "../hooks/useLocationDirectory";
import type { LocationStat } from "../utils/storage";
import {
  applyLocationSuggestion,
  buildLocationSuggestionSectionsFromNormalized,
  formatLocationPickerSubtitle,
  normalizeLocationProbes,
  type LocationSuggestion,
} from "../utils/locationSearch";

interface LocationPickerProps {
  authToken: string;
  currentValue: string;
  recentLocations: LocationStat[];
  onSelect: (value: string) => void;
}

type EditLocationActionProps = LocationPickerProps;

export function LocationPicker({ authToken, currentValue, recentLocations, onSelect }: LocationPickerProps) {
  const [query, setQuery] = useState(currentValue);
  const { pop } = useNavigation();
  const { probes, isLoading } = useLocationDirectory(authToken);
  const deferredQuery = useDeferredValue(query);
  const normalizedProbes = useMemo(() => normalizeLocationProbes(probes), [probes]);
  const sections = useMemo(
    () => buildLocationSuggestionSectionsFromNormalized(normalizedProbes, recentLocations, deferredQuery),
    [normalizedProbes, recentLocations, deferredQuery],
  );
  const hasQuery = query.trim().length > 0;

  function handleSelect(suggestion: LocationSuggestion) {
    onSelect(applyLocationSuggestion(query, suggestion));
    pop();
  }

  function getActionTitle(suggestion: LocationSuggestion) {
    if (suggestion.section === "Use Typed Value") {
      return "Use Typed Value";
    }

    return query.includes("+") || query.trimEnd().endsWith(",") ? "Apply Suggestion" : "Use Suggestion";
  }

  return (
    <List
      navigationTitle="Edit Location"
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Type a city, country, provider, or combine with +"
      searchText={query}
      onSearchTextChange={setQuery}
    >
      {sections.length === 0 ? (
        <List.EmptyView
          title={hasQuery ? "No matches yet" : "Start typing a location"}
          description={
            hasQuery
              ? "You can still use exactly what you typed, even without a suggested match."
              : "Try a city, country, provider, or combine filters like paris+aws."
          }
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <List.Item
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                accessories={
                  item.count ? [{ text: `${item.count}`, tooltip: `${item.count} matching probes` }] : undefined
                }
                actions={
                  <ActionPanel>
                    <Action title={getActionTitle(item)} icon={Icon.CheckCircle} onAction={() => handleSelect(item)} />
                    <Action.CopyToClipboard title="Copy Value" content={item.value} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function getEditLocationActionTitle(value: string) {
  return `Edit Location (${formatLocationPickerSubtitle(value)})`;
}

export function EditLocationAction({ authToken, currentValue, recentLocations, onSelect }: EditLocationActionProps) {
  return (
    <Action.Push
      title={getEditLocationActionTitle(currentValue)}
      icon={Icon.Globe}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      }}
      target={
        <LocationPicker
          authToken={authToken}
          currentValue={currentValue}
          recentLocations={recentLocations}
          onSelect={onSelect}
        />
      }
    />
  );
}
