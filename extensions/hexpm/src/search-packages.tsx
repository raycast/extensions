import {
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  useNavigation,
  Action,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import { Package, Release } from "./types";
import {
  getDiffHtmlUrl,
  getPackageId,
  packageNameIncludes,
  getPreviewHtmlUrl,
  getReleaseHtmlUrl,
  getReleaseDocsHtmlUrl,
} from "./helpers";
import { usePackagesQuery } from "./hooks/use-packages-query";
import { useVisitedPackages } from "./hooks/use-visited-packages";
import { useState } from "react";

export default function Command() {
  const preferenceValues = getPreferenceValues();
  const [searchText, setSearchText] = useState("");
  const visitedPackages = useVisitedPackages();
  const packagesQuery = usePackagesQuery({
    search: searchText,
    sort: preferenceValues.search_sorting,
    onError(error: Error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed searching packages",
        message: error.message,
      });
    },
  });
  const frecencySorting = useFrecencySorting(packagesQuery.data, {
    key: getPackageId,
  });
  const isLoading = visitedPackages.isLoading || packagesQuery.isLoading;

  return (
    <List
      isLoading={isLoading}
      pagination={packagesQuery.pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Hex packages..."
      throttle
    >
      <List.Section
        title="Visited Packages"
        subtitle={visitedPackages.data ? `${visitedPackages.data.length} package(s)` : "No visited packages"}
      >
        {visitedPackages.data.filter(packageNameIncludes(searchText)).map((pkg) => (
          <PackageListItem
            key={pkg.name}
            package={pkg}
            onVisit={visitedPackages.onVisitPackage}
            onResetRanking={frecencySorting.resetRanking}
          />
        ))}
      </List.Section>
      <List.Section
        title="Found Packages"
        subtitle={packagesQuery.data ? `${packagesQuery.data.length} package(s)` : undefined}
      >
        {frecencySorting.data?.map((pkg) => (
          <PackageListItem
            key={pkg.name}
            package={pkg}
            onVisit={visitedPackages.onVisitPackage}
            onResetRanking={frecencySorting.resetRanking}
          />
        ))}
      </List.Section>
    </List>
  );
}

function PackageListItem(props: {
  package: Package;
  onVisit: (pkg: Package) => void;
  onResetRanking: (pkg: Package) => Promise<void>;
}) {
  const navigation = useNavigation();

  return (
    <List.Item
      title={props.package.name}
      subtitle={props.package.meta.description}
      actions={
        <ActionPanel title={props.package.name}>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Hex"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              url={props.package.html_url}
              onOpen={() => props.onVisit(props.package)}
            />
            <Action.OpenInBrowser
              title="Open in Hex Docs"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              url={props.package.docs_html_url}
              onOpen={() => props.onVisit(props.package)}
            />
            <Action
              icon={Icon.List}
              title="Browse Releases"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => navigation.push(<ReleaseView package={props.package} />)}
            />
            <ActionPanel.Submenu icon={Icon.Globe} title="Open Links">
              {Object.entries(props.package.meta.links).map(([key, url]) => {
                return <Action.OpenInBrowser key={key} title={`Open ${key}`} url={url} />;
              })}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Exact Version"
              content={props.package.latest_stable_version}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy mix.exs"
              content={props.package.configs["mix.exs"]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy rebar.config"
              content={props.package.configs["rebar.config"]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action.CopyToClipboard
              title="Copy erlang.mk"
              content={props.package.configs["erlang.mk"]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Reset Ranking"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => props.onResetRanking(props.package)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[{ tag: props.package.latest_stable_version }]}
    />
  );
}

function ReleaseView(props: { package: Package }) {
  return (
    <List>
      {props.package.releases.map((release, index) => {
        return <ReleaseItem index={index} key={release.version} release={release} package={props.package} />;
      })}
    </List>
  );
}

function ReleaseItem(props: { index: number; release: Release; package: Package }) {
  const accessories: List.Item.Accessory[] = [{ date: new Date(props.release.inserted_at) }];
  const previousRelease = props.package.releases[props.index + 1];

  if (props.release.has_docs) {
    accessories.push({
      icon: Icon.Book,
      tooltip: "Has Documentation",
    });
  }

  if (props.release.version === props.package.latest_stable_version) {
    accessories.push({
      icon: Icon.Star,
      tooltip: "Latest Stable Version",
    });
  }

  const retirement = props.package.retirements[props.release.version];
  if (retirement) {
    accessories.push({
      tag: { value: retirement.reason === "report" ? "REPORT" : "RETIRED", color: Color.Red },
      tooltip: props.package.retirements[props.release.version].message,
    });
  }

  return (
    <List.Item
      key={props.release.version}
      title={`${props.package.name}@${props.release.version}`}
      actions={
        <ActionPanel title={`${props.package.name}@${props.release.version}`}>
          <Action.OpenInBrowser
            title="Open in Hex"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            url={getReleaseHtmlUrl(props.package, props.release)}
          />
          <Action.OpenInBrowser
            title="Open in Hex Docs"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            url={getReleaseDocsHtmlUrl(props.package, props.release)}
          />
          <Action.OpenInBrowser
            title="Open Preview in Hex"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            icon={Icon.Code}
            url={getPreviewHtmlUrl(props.package, props.release)}
          />
          {previousRelease && (
            <Action.OpenInBrowser
              title="Open Diff in Hex"
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              url={getDiffHtmlUrl(props.package, props.release, previousRelease)}
            />
          )}
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}
