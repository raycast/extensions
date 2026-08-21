import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { Application } from "@raycast/api";
import { detectCorrection, isLayoutMode } from "./detection";
import type { LayoutMode } from "./layout";

type Preferences = {
  layoutMode: string;
};

function QueryActions({ query }: { query: string }) {
  const webSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser title={`Search Google for “${query}”`} url={webSearchUrl} icon={Icon.MagnifyingGlass} />
      <Action.CopyToClipboard title="Copy Corrected Text" content={query} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action.Paste title="Paste Corrected Text" content={query} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
      <Action title="Open Layout Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const layoutMode: LayoutMode = isLayoutMode(preferences.layoutMode) ? preferences.layoutMode : "auto";
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getApplications()
      .then((installedApplications) => {
        if (isMounted) setApplications(installedApplications);
      })
      .catch(async (error: unknown) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Read Installed Applications",
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const correction = useMemo(
    () => detectCorrection(searchText, applications, layoutMode),
    [applications, layoutMode, searchText],
  );
  const correctionLabel = correction.layout
    ? `${correction.layout.title} (${correction.layout.keyboardName}) → US English`
    : "No Conversion";
  const didCorrectText = correction.query !== searchText;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Type using any supported keyboard layout"
      navigationTitle={didCorrectText ? `${searchText} → ${correction.query}` : "Keyboard Layout Search"}
    >
      {correction.applications.length > 0 ? (
        <List.Section title="Applications" subtitle={correctionLabel}>
          {correction.applications.map(({ application }) => (
            <List.Item
              key={application.path}
              icon={{ fileIcon: application.path }}
              title={application.name}
              subtitle={application.bundleId}
              accessories={didCorrectText ? [{ text: correction.query }] : undefined}
              actions={
                <ActionPanel>
                  <Action.Open title={`Open ${application.name}`} target={application.path} icon={Icon.AppWindow} />
                  <ActionPanel.Section title="Corrected Query">
                    <Action.OpenInBrowser
                      title={`Search Google for “${correction.query}”`}
                      url={`https://www.google.com/search?q=${encodeURIComponent(correction.query)}`}
                      icon={Icon.MagnifyingGlass}
                    />
                    <Action.CopyToClipboard
                      title="Copy Corrected Text"
                      content={correction.query}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.Paste
                      title="Paste Corrected Text"
                      content={correction.query}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    />
                    <Action title="Open Layout Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {!isLoading && correction.query ? (
        <List.Section title={correction.applications.length > 0 ? "Other Actions" : "No Matching Application"}>
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={`Search Google for “${correction.query}”`}
            subtitle={correctionLabel}
            actions={<QueryActions query={correction.query} />}
          />
        </List.Section>
      ) : null}

      {!isLoading && layoutMode === "auto" && correction.alternatives.length > 0 ? (
        <List.Section title="Other Possible Conversions">
          {correction.alternatives.map((alternative) => (
            <List.Item
              key={`${alternative.layout?.id ?? "original"}-${alternative.query}`}
              icon={Icon.Keyboard}
              title={alternative.query}
              subtitle={alternative.layout ? `${alternative.layout.title} → US English` : "No Conversion"}
              actions={<QueryActions query={alternative.query} />}
            />
          ))}
        </List.Section>
      ) : null}

      {!isLoading && !searchText ? (
        <List.EmptyView
          icon={Icon.Keyboard}
          title="Enter a Query"
          description="The query will be converted to the matching US English keys."
          actions={
            <ActionPanel>
              <Action title="Open Layout Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
