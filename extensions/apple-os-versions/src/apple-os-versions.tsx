import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ReactElement, useEffect, useState } from "react";
import { CveList, CveSearch } from "./cve-list";
import { fetchReleases, formatDate, PastRelease, Platform, PLATFORMS, Release } from "./sofa";

// SF Symbols rendered to assets/ (each has an @dark variant for the dark theme).
const PLATFORM_ICONS: Record<Platform, string> = {
  macOS: "sf-macbook-gen1.png",
  iOS: "sf-iphone.png",
  iPadOS: "sf-ipad.png",
  watchOS: "sf-applewatch.png",
  tvOS: "sf-appletv-fill.png",
  visionOS: "sf-vision-pro.png",
};

type ActionId = Preferences["primaryAction"];

// Bump when the Release shape changes so cached data from older builds is ignored.
const CACHE_VERSION = 5;

const HOUR_MS = 60 * 60 * 1000;

export default function Command() {
  const { primaryAction, refreshInterval } = getPreferenceValues<Preferences>();
  const [lastUpdated, setLastUpdated] = useCachedState(`lastUpdated-v${CACHE_VERSION}`, 0);
  // Decided once per launch: only download when the saved data is older than the chosen interval.
  const [shouldFetch, setShouldFetch] = useState(() => Date.now() - lastUpdated >= Number(refreshInterval) * HOUR_MS);
  const { data, error, isLoading, revalidate } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_cacheVersion: number) => fetchReleases(),
    [CACHE_VERSION],
    { keepPreviousData: true, execute: shouldFetch, onData: () => setLastUpdated(Date.now()) },
  );
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", false);

  // Nothing saved yet (first run or a cleared cache): download regardless of the interval.
  useEffect(() => {
    if (!shouldFetch && !data) setShouldFetch(true);
  }, [shouldFetch, data]);

  // Turning on `execute` triggers a fetch; once it's on, revalidate() refetches.
  const refresh = () => (shouldFetch ? revalidate() : setShouldFetch(true));

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Filter by version or build">
      {!isLoading && (
        <List.EmptyView
          icon={error ? Icon.WifiDisabled : Icon.MagnifyingGlass}
          title={error ? "Couldn't Load SOFA Data" : "No Matching Versions"}
          description={error?.message}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      )}
      {PLATFORMS.map((platform) => (
        <List.Section key={platform} title={platform}>
          {data
            ?.filter((release) => release.platform === platform)
            .map((release) => (
              <ReleaseItem
                key={release.key}
                release={release}
                allReleases={data}
                primaryAction={primaryAction}
                isShowingDetail={isShowingDetail}
                onToggleDetail={() => setIsShowingDetail((value) => !value)}
                lastUpdated={lastUpdated}
                onRefresh={refresh}
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function ReleaseItem(props: {
  release: Release;
  allReleases: Release[];
  primaryAction: ActionId;
  isShowingDetail: boolean;
  lastUpdated: number;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const { release } = props;
  const extraBuilds = release.allBuilds.length - 1;
  const buildText = !release.build
    ? "No build listed"
    : extraBuilds > 0
      ? `${release.build} (+${extraBuilds})`
      : release.build;

  const accessories: List.Item.Accessory[] = [];
  if (release.exploitedCves.length > 0) {
    accessories.push({
      tag: { value: "Exploited", color: Color.Red },
      tooltip: `Fixes actively exploited: ${release.exploitedCves.join(", ")}`,
    });
  }
  accessories.push(
    { tag: { value: `${release.cves.length} CVE${release.cves.length === 1 ? "" : "s"}`, color: Color.SecondaryText } },
    { text: formatDate(release.releaseDate), icon: Icon.Calendar },
  );

  const actions: Record<ActionId, ReactElement | undefined> = {
    copyVersion: <Action.CopyToClipboard key="copyVersion" title="Copy Version" content={release.version} />,
    copyBuild: release.allBuilds.length ? (
      <Action.CopyToClipboard
        key="copyBuild"
        title={release.allBuilds.length > 1 ? "Copy All Builds" : "Copy Build"}
        content={release.allBuilds.join(", ")}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    ) : undefined,
    showCves: (
      <Action.Push
        key="showCves"
        title="Show CVEs"
        icon={Icon.Shield}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        target={<CveList release={release} />}
      />
    ),
    searchCve: (
      <Action.Push
        key="searchCve"
        title="Search CVE"
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        target={<CveSearch releases={props.allReleases} />}
      />
    ),
    openSecurityNotes: release.securityUrl ? (
      <Action.OpenInBrowser
        key="openSecurityNotes"
        title="Open Apple Security Notes"
        url={release.securityUrl}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    ) : undefined,
    openSofa: (
      <Action.OpenInBrowser
        key="openSofa"
        title="Open in SOFA"
        url={release.sofaUrl}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    ),
  };
  // The chosen action goes first so Enter runs it; fall back to Copy Version when it isn't available.
  const primary: ActionId = actions[props.primaryAction] ? props.primaryAction : "copyVersion";
  const others = (ids: ActionId[]) => ids.filter((id) => id !== primary).map((id) => actions[id]);

  return (
    <List.Item
      icon={PLATFORM_ICONS[release.platform]}
      title={release.title}
      subtitle={props.isShowingDetail ? undefined : buildText}
      keywords={[release.version, ...release.allBuilds]}
      accessories={props.isShowingDetail ? undefined : accessories}
      detail={<ReleaseDetail release={release} lastUpdated={props.lastUpdated} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {actions[primary]}
            {others(["copyVersion", "copyBuild", "showCves", "searchCve"])}
            {release.exploitedCves.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Exploited CVE IDs"
                content={release.exploitedCves.join(", ")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {others(["openSecurityNotes", "openSofa"])}
            {release.earlierReleases.length > 0 && <EarlierReleasesMenu releases={release.earlierReleases} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={props.isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={props.onToggleDetail}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.onRefresh}
            />
            <Action
              title="Configure Extension"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EarlierReleasesMenu({ releases }: { releases: PastRelease[] }) {
  return (
    <ActionPanel.Submenu
      title="Earlier Releases…"
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
    >
      {releases.map((past) => (
        <ActionPanel.Submenu
          key={past.key}
          icon={Icon.Tag}
          title={`${past.version} · ${formatDate(past.releaseDate)}${past.deviceSpecific ? " · Device-Specific" : ""}…`}
        >
          <Action.CopyToClipboard title="Copy Version" content={past.version} />
          {past.build && <Action.CopyToClipboard title="Copy Build" content={past.build} />}
          {past.securityUrl && <Action.OpenInBrowser title="Open Apple Security Notes" url={past.securityUrl} />}
        </ActionPanel.Submenu>
      ))}
    </ActionPanel.Submenu>
  );
}

function ReleaseDetail({ release, lastUpdated }: { release: Release; lastUpdated: number }) {
  const { Metadata } = List.Item.Detail;
  return (
    <List.Item.Detail
      metadata={
        <Metadata>
          <Metadata.Label title="Version" text={release.version} />
          {release.allBuilds.length > 0 ? (
            <Metadata.TagList title={release.allBuilds.length > 1 ? "Builds" : "Build"}>
              {release.allBuilds.map((build) => (
                <Metadata.TagList.Item key={build} text={build} />
              ))}
            </Metadata.TagList>
          ) : (
            <Metadata.Label title="Build" text="Not listed" />
          )}
          <Metadata.Label title="Release Date" text={formatDate(release.releaseDate)} />
          <Metadata.Separator />
          <Metadata.Label title="CVEs Fixed" text={String(release.cves.length)} />
          {release.exploitedCves.length > 0 ? (
            <Metadata.TagList title="Actively Exploited">
              {release.exploitedCves.map((id) => (
                <Metadata.TagList.Item key={id} text={id} color={Color.Red} />
              ))}
            </Metadata.TagList>
          ) : (
            <Metadata.Label title="Actively Exploited" text="None" />
          )}
          {release.securityUrl && (
            <Metadata.Link title="Apple Security Notes" target={release.securityUrl} text="support.apple.com" />
          )}
          <Metadata.Link title="SOFA" target={release.sofaUrl} text="sofa.macadmins.io" />
          {lastUpdated > 0 && (
            <>
              <Metadata.Separator />
              <Metadata.Label
                title="Data Updated"
                text={new Date(lastUpdated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              />
            </>
          )}
        </Metadata>
      }
    />
  );
}
