import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { FeatureDetail } from "./components/FeatureDetail";
import { useFavorites } from "./hooks/useFavorites";
import {
  getUniqueCollections,
  useFeatureFilters,
} from "./hooks/useFeatureFilters";
import { useFeatures } from "./hooks/useFeatures";
import type { Feature } from "./types";
import {
  getFeatureCollectionName,
  getFeatureGitHubUrl,
} from "./utils/collection";

function formatCacheTime(date: Date | null, featureCount: number): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  let timeStr: string;
  if (diffHours > 0) {
    timeStr = `${diffHours}h ago`;
  } else if (diffMins > 0) {
    timeStr = `${diffMins}m ago`;
  } else {
    timeStr = "just now";
  }

  return `${featureCount} features | Cached ${timeStr}`;
}

export default function Command() {
  const {
    features,
    isLoading,
    error,
    progress,
    cacheTimestamp,
    failedCollections,
    refresh,
  } = useFeatures();
  const {
    favorites,
    isFavorite,
    toggleFavorite,
    isLoading: favoritesLoading,
  } = useFavorites();
  const { filteredFeatures, updateFilter, hasActiveFilters, resetFilters } =
    useFeatureFilters(features, favorites);

  const loadingText = progress
    ? `Loading... ${progress.completed}/${progress.total} collections`
    : "Loading features...";

  const navigationTitle = cacheTimestamp
    ? formatCacheTime(cacheTimestamp, filteredFeatures.length)
    : undefined;

  const collections = getUniqueCollections(features);

  const searchBarAccessory = (
    <List.Dropdown
      tooltip="Filter Features"
      onChange={(value) => {
        if (value === "all") {
          resetFilters();
        } else if (value === "favorites") {
          updateFilter("showFavoritesOnly", true);
          updateFilter("showOfficialOnly", false);
          updateFilter("collection", null);
        } else if (value === "official") {
          updateFilter("showFavoritesOnly", false);
          updateFilter("showOfficialOnly", true);
          updateFilter("collection", null);
        } else if (value === "with-options") {
          updateFilter("hasOptions", true);
        } else if (value.startsWith("collection:")) {
          updateFilter("showFavoritesOnly", false);
          updateFilter("showOfficialOnly", false);
          updateFilter("collection", value.replace("collection:", ""));
        }
      }}
    >
      <List.Dropdown.Item title="All Features" value="all" />
      <List.Dropdown.Section title="Quick Filters">
        <List.Dropdown.Item
          title="★ Favorites"
          value="favorites"
          icon={Icon.Star}
        />
        <List.Dropdown.Item
          title="Official Features"
          value="official"
          icon={Icon.Checkmark}
        />
        <List.Dropdown.Item
          title="With Options"
          value="with-options"
          icon={Icon.List}
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="By Collection">
        {collections.map((collection) => (
          <List.Dropdown.Item
            key={collection}
            title={collection}
            value={`collection:${collection}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading || favoritesLoading}
      searchBarPlaceholder="Search devcontainer features..."
      navigationTitle={navigationTitle}
      searchBarAccessory={searchBarAccessory}
    >
      {error && !isLoading ? (
        <List.EmptyView
          title="Failed to load features"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : isLoading && features.length === 0 ? (
        <List.EmptyView title={loadingText} icon={Icon.Download} />
      ) : (
        <>
          {failedCollections.length > 0 && (
            <List.Section title="Notice">
              <List.Item
                title={`${failedCollections.length} collections failed to load`}
                subtitle="Some features may be missing"
                icon={Icon.Warning}
                accessories={[{ text: "View details" }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Failed Collections"
                      icon={Icon.List}
                      onAction={() => {
                        // Could open a modal or show toast with details
                      }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={refresh}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          <List.Section
            title={hasActiveFilters ? "Filtered Features" : "Features"}
            subtitle={
              hasActiveFilters
                ? `${filteredFeatures.length} of ${features.length} features`
                : `${features.length} features`
            }
          >
            {filteredFeatures.map((feature) => (
              <FeatureListItem
                key={`${feature.collection.ociReference}/${feature.id}`}
                feature={feature}
                isFavorite={isFavorite(feature.reference)}
                onToggleFavorite={() => toggleFavorite(feature.reference)}
                onRefresh={refresh}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface FeatureListItemProps {
  feature: Feature;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRefresh: () => void;
}

function FeatureListItem({
  feature,
  isFavorite,
  onToggleFavorite,
  onRefresh,
}: FeatureListItemProps) {
  const collectionName = getFeatureCollectionName(feature);
  const githubUrl = getFeatureGitHubUrl(feature);

  const accessories: List.Item.Accessory[] = [];
  if (isFavorite) {
    accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
  }
  accessories.push({
    tag: collectionName,
    tooltip: feature.collection.sourceInformation,
  });

  return (
    <List.Item
      title={feature.name}
      subtitle={feature.description}
      accessories={accessories}
      keywords={[
        feature.id,
        feature.name,
        feature.description || "",
        collectionName,
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<FeatureDetail feature={feature} />}
            />
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={onToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.CopyToClipboard
              title="Copy Reference"
              content={`"${feature.reference}"`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Reference Without Quotes"
              content={feature.reference}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {feature.documentationURL && (
              <Action.OpenInBrowser
                title="Open Documentation"
                url={feature.documentationURL}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            <Action.OpenInBrowser
              title="Open Source Repository"
              url={githubUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Features"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
