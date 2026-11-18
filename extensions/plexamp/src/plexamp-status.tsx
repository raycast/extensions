import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clearManagedConfiguration,
  getLibraryStats,
  getMetadataByKey,
  getMusicSections,
  getPlexampClientInfo,
  getSelectedLibrary,
  getTimeline,
  saveSelectedLibrary,
} from "./plex";
import { PreferencesAction } from "./shared-ui";
import { PlexSetupView } from "./plex-setup-view";
import type { LibrarySection, LibraryStats, MetadataItem, PlexampClientInfo, TimelineInfo } from "./types";

interface StatusState {
  client?: PlexampClientInfo;
  libraries: LibrarySection[];
  libraryStats?: LibraryStats;
  selectedLibrary?: LibrarySection;
  timeline?: TimelineInfo;
  current?: MetadataItem;
}

const numberFormatter = new Intl.NumberFormat();

function row(label: string, value?: string | number): string {
  const formattedValue = typeof value === "number" ? numberFormatter.format(value) : value;

  return `| ${label} | ${formattedValue ?? "-"} |`;
}

function LibraryPicker(props: {
  libraries: LibrarySection[];
  selectedLibraryKey?: string;
  onSelected: () => Promise<void>;
}) {
  const { pop } = useNavigation();

  const selectLibrary = useCallback(
    async (library: LibrarySection) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Selecting ${library.title}...`,
      });

      try {
        await saveSelectedLibrary(library);
        await props.onSelected();
        toast.style = Toast.Style.Success;
        toast.title = `${library.title} selected`;
        await pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not select library";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [pop, props],
  );

  return (
    <List navigationTitle="Select Library" searchBarPlaceholder="Choose a Plex music library">
      {props.libraries.map((library) => (
        <List.Item
          key={library.key}
          icon={Icon.Music}
          title={library.title}
          accessories={[
            ...(library.key === props.selectedLibraryKey
              ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }]
              : []),
            ...(library.totalSize !== undefined ? [{ text: `${library.totalSize} artists` }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action title="Use This Library" icon={Icon.CheckCircle} onAction={() => void selectLibrary(library)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [state, setState] = useState<StatusState>({ libraries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [client, libraries, selectedLibrary, timeline] = await Promise.all([
        getPlexampClientInfo(),
        getMusicSections(),
        getSelectedLibrary(),
        getTimeline(),
      ]);
      const libraryStats = selectedLibrary ? await getLibraryStats(selectedLibrary.key) : undefined;
      const current = timeline.key ? await getMetadataByKey(timeline.key) : undefined;

      setState({
        client,
        libraries,
        libraryStats,
        selectedLibrary,
        timeline,
        current,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const signOut = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Signing out from Plex...",
    });

    try {
      await clearManagedConfiguration();
      await reload();
      toast.style = Toast.Style.Success;
      toast.title = "Signed out from Plex";
    } catch (signOutError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not sign out from Plex";
      toast.message = signOutError instanceof Error ? signOutError.message : String(signOutError);
    }
  }, [reload]);

  const markdown = useMemo(() => {
    const currentItem = state.current?.title
      ? state.current.type === "track"
        ? `${state.current.title} - ${[state.current.grandparentTitle, state.current.parentTitle].filter(Boolean).join(" / ")}`
        : state.current.title
      : undefined;

    return [
      "# Plexamp Status",
      "",
      "## Client",
      "",
      "| Field | Value |",
      "| --- | --- |",
      row("Name", state.client?.name),
      row("Product", state.client?.product),
      row("Version", state.client?.version),
      row("Platform", [state.client?.platform, state.client?.platformVersion].filter(Boolean).join(" ")),
      row("Device", state.client?.deviceName),
      row("Address", state.client?.address),
      row("Port", state.client?.port),
      row("Protocol", state.client?.protocol),
      row("Machine ID", state.client?.machineIdentifier),
      "",
      "## Playback",
      "",
      "| Field | Value |",
      "| --- | --- |",
      row("State", state.timeline?.state),
      row("Current Item", currentItem),
      row("Volume", state.timeline?.volume !== undefined ? `${state.timeline.volume}%` : undefined),
      row("Repeat", state.timeline?.repeat),
      row("Shuffle", state.timeline?.shuffle),
      row("Play Queue ID", state.timeline?.playQueueID),
      "",
      "## Library",
      "",
      "| Field | Value |",
      "| --- | --- |",
      row("Selected Library", state.selectedLibrary?.title),
      row("Artists", state.libraryStats?.artists),
      row("Albums", state.libraryStats?.albums),
      row("Tracks", state.libraryStats?.tracks),
    ].join("\n");
  }, [state]);

  if (!isLoading && (error || !state.selectedLibrary)) {
    return <PlexSetupView navigationTitle="Plexamp Status" problem={error} onConfigured={() => void reload()} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Client" text={state.client?.name ?? "-"} icon={Icon.Monitor} />
          <Detail.Metadata.Label title="Playback" text={state.timeline?.state ?? "-"} icon={Icon.Play} />
          <Detail.Metadata.Label title="Library" text={state.selectedLibrary?.title ?? "-"} icon={Icon.Music} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Stats">
            {state.libraryStats?.artists !== undefined ? (
              <Detail.Metadata.TagList.Item
                text={`${numberFormatter.format(state.libraryStats.artists)} artists`}
                color={Color.Green}
              />
            ) : null}
            {state.libraryStats?.albums !== undefined ? (
              <Detail.Metadata.TagList.Item
                text={`${numberFormatter.format(state.libraryStats.albums)} albums`}
                color={Color.Orange}
              />
            ) : null}
            {state.libraryStats?.tracks !== undefined ? (
              <Detail.Metadata.TagList.Item
                text={`${numberFormatter.format(state.libraryStats.tracks)} tracks`}
                color={Color.Purple}
              />
            ) : null}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Reload Status" icon={Icon.ArrowClockwise} onAction={() => void reload()} />
          <Action.Push
            title="Select Library"
            icon={Icon.Music}
            target={
              <LibraryPicker
                libraries={state.libraries}
                selectedLibraryKey={state.selectedLibrary?.key}
                onSelected={reload}
              />
            }
          />
          <Action title="Sign out of Plex" icon={Icon.XMarkCircle} onAction={() => void signOut()} />
          <PreferencesAction />
        </ActionPanel>
      }
    />
  );
}
