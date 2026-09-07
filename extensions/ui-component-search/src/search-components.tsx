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

function ComponentItem({ component }: { component: UIComponent }) {
  const lib = libraries.find((l) => l.id === component.library);
  return (
    <List.Item
      key={`${component.library}-${component.slug}`}
      title={component.name}
      subtitle={component.slug}
      accessories={[{ text: lib?.name ?? component.library }]}
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

/** A visible row marking a library whose live fetch failed. */
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
  const { isLoading, components, failedLibraries } = useComponents(filterLibrary);

  const failedIds = new Set(failedLibraries.map((f) => f.id));
  // When a single library is selected, only show its failure (if any).
  const visibleFailures = filterLibrary ? failedLibraries.filter((f) => f.id === filterLibrary) : failedLibraries;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search UI components..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Library" value={selectedLibrary} onChange={setSelectedLibrary}>
          <List.Dropdown.Item title="All Libraries" value={ALL_LIBRARIES} icon={Icon.Globe} />
          <List.Dropdown.Section title="Libraries">
            {libraries.map((lib) => {
              const failed = failedIds.has(lib.id);
              return (
                <List.Dropdown.Item
                  key={lib.id}
                  title={failed ? `${lib.name} (failed)` : lib.name}
                  value={lib.id}
                  icon={
                    failed ? { source: Icon.Warning, tintColor: Color.Red } : { source: lib.icon, fallback: Icon.Box }
                  }
                />
              );
            })}
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
            <ComponentItem key={`${component.library}-${component.slug}`} component={component} />
          ))
        : // All libraries — grouped by library
          Array.from(groupByLibrary(components)).map(([libraryId, libComponents]) => {
            const lib = libraries.find((l) => l.id === libraryId);
            if (libComponents.length === 0) return null;
            return (
              <List.Section key={libraryId} title={lib?.name ?? libraryId}>
                {libComponents.map((component) => (
                  <ComponentItem key={`${component.library}-${component.slug}`} component={component} />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
}
