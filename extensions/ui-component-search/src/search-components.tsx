import { ActionPanel, Action, List, Icon, Keyboard, Color } from "@raycast/api";
import { useState } from "react";
import { FailedLibrary, useComponents } from "./hooks/use-components";
import { libraries } from "./providers";
import { LibraryId, UIComponent } from "./types";

const ALL_LIBRARIES = "all";

/** Group components by library id, preserving library display order */
function groupByLibrary(components: UIComponent[]): Map<LibraryId, UIComponent[]> {
  const groups = new Map<LibraryId, UIComponent[]>();
  for (const lib of libraries) {
    groups.set(lib.id, []);
  }
  for (const component of components) {
    const group = groups.get(component.library);
    if (group) {
      group.push(component);
    }
  }
  return groups;
}

function ComponentItem({ component, isFallback }: { component: UIComponent; isFallback: boolean }) {
  const lib = libraries.find((l) => l.id === component.library);
  const accessories: List.Item.Accessory[] = [{ text: lib?.name ?? component.library }];
  if (isFallback) {
    accessories.unshift({
      icon: { source: Icon.Warning, tintColor: Color.Yellow },
      tooltip: "Live fetch failed — showing bundled fallback data, which may be out of date",
    });
  }
  return (
    <List.Item
      key={`${component.library}-${component.slug}`}
      title={component.name}
      subtitle={component.slug}
      accessories={accessories}
      icon={{ source: lib?.icon ?? Icon.Box, fallback: Icon.Box }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={component.url} />
          <Action.CopyToClipboard title="Copy URL" content={component.url} />
          <Action.CopyToClipboard
            title="Copy Component Name"
            content={component.name}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

/** A visible row marking a library whose fetch failed outright (no data at all). */
function FailedLibraryItem({ failure }: { failure: FailedLibrary }) {
  const lib = libraries.find((l) => l.id === failure.id);
  return (
    <List.Item
      key={`failed-${failure.id}`}
      title={failure.name}
      subtitle="Failed to load — its docs site may have changed"
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      accessories={[{ text: failure.message, icon: { source: Icon.ExclamationMark, tintColor: Color.Red } }]}
      actions={
        <ActionPanel>
          {lib && <Action.OpenInBrowser title="Open Library Website" url={lib.baseUrl} />}
          <Action.CopyToClipboard title="Copy Error Message" content={failure.message} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchComponents() {
  const [selectedLibrary, setSelectedLibrary] = useState<string>(ALL_LIBRARIES);
  const filterLibrary = selectedLibrary === ALL_LIBRARIES ? undefined : (selectedLibrary as LibraryId);
  const { isLoading, components, failedLibraries, fallbackLibraries } = useComponents(filterLibrary);

  const failedIds = new Set(failedLibraries.map((f) => f.id));
  const fallbackIds = new Set(fallbackLibraries.map((f) => f.id));

  // When a single library is selected, only show its own degraded state (if any).
  const visibleFailures = filterLibrary ? failedLibraries.filter((f) => f.id === filterLibrary) : failedLibraries;

  function dropdownIcon(lib: (typeof libraries)[number]) {
    if (failedIds.has(lib.id)) return { source: Icon.Warning, tintColor: Color.Red };
    if (fallbackIds.has(lib.id)) return { source: Icon.Warning, tintColor: Color.Yellow };
    return { source: lib.icon, fallback: Icon.Box };
  }

  function dropdownTitle(lib: (typeof libraries)[number]) {
    if (failedIds.has(lib.id)) return `${lib.name} (failed)`;
    if (fallbackIds.has(lib.id)) return `${lib.name} (fallback)`;
    return lib.name;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search UI components..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Library" value={selectedLibrary} onChange={setSelectedLibrary}>
          <List.Dropdown.Item title="All Libraries" value={ALL_LIBRARIES} icon={Icon.Globe} />
          <List.Dropdown.Section title="Libraries">
            {libraries.map((lib) => (
              <List.Dropdown.Item key={lib.id} title={dropdownTitle(lib)} value={lib.id} icon={dropdownIcon(lib)} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {visibleFailures.length > 0 && (
        <List.Section title="Failed to Load" subtitle={`${visibleFailures.length}`}>
          {visibleFailures.map((failure) => (
            <FailedLibraryItem key={`failed-${failure.id}`} failure={failure} />
          ))}
        </List.Section>
      )}
      {filterLibrary
        ? // Single library selected — flat list
          components.map((component) => (
            <ComponentItem
              key={`${component.library}-${component.slug}`}
              component={component}
              isFallback={fallbackIds.has(component.library)}
            />
          ))
        : // All libraries — grouped by library
          Array.from(groupByLibrary(components)).map(([libraryId, libComponents]) => {
            const lib = libraries.find((l) => l.id === libraryId);
            if (libComponents.length === 0) return null;
            const isFallback = fallbackIds.has(libraryId);
            return (
              <List.Section
                key={libraryId}
                title={lib?.name ?? libraryId}
                subtitle={isFallback ? "Using fallback data" : undefined}
              >
                {libComponents.map((component) => (
                  <ComponentItem
                    key={`${component.library}-${component.slug}`}
                    component={component}
                    isFallback={isFallback}
                  />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
}
