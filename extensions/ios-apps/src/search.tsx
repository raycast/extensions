import { List, Icon } from "@raycast/api";
import { useState, useCallback } from "react";
import { formatPrice } from "./utils/paths";
import { renderStarRating, formatDate } from "./utils/common";
import { AppActionPanel } from "./components/app-action-panel";
import { useAppSearch, useAppDownload } from "./hooks";

export default function Search() {
  const [searchText, setSearchText] = useState("");

  // Use the custom hooks
  const { apps, isLoading, error, totalResults, setSearchText: setSearchFromHook } = useAppSearch(searchText, 500);
  const { downloadApp } = useAppDownload();

  // Create a reusable search handler to avoid duplicate code
  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchText(text);
      setSearchFromHook(text);
    },
    [setSearchText, setSearchFromHook],
  );

  // If no search text has been entered yet, show a custom empty view
  if (!searchText) {
    return (
      <List onSearchTextChange={handleSearchTextChange} isLoading={isLoading}>
        <List.EmptyView
          title="Type Query to Search"
          description="Search for apps by name, developer, or bundle Id."
          icon="no-view.png"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search for iOS apps..."
      throttle
      navigationTitle="Search iOS Apps"
    >
      {error ? (
        <List.EmptyView title={error} icon={{ source: Icon.Warning }} />
      ) : apps.length === 0 && searchText ? (
        <List.EmptyView title="No results found" icon={{ source: Icon.MagnifyingGlass }} />
      ) : (
        <List.Section title={totalResults > 0 ? `Results (${totalResults})` : ""}>
          {apps.map((app) => {
            // Get the app rating
            const rating = app.averageUserRatingForCurrentVersion || app.averageUserRating;
            const ratingText = rating ? renderStarRating(rating) : "";

            // Format release date
            const releaseDate = formatDate(app.currentVersionReleaseDate || app.releaseDate);

            // Get app icon
            const iconUrl = app.artworkUrl60 || app.artworkUrl512 || app.iconUrl;

            return (
              <List.Item
                key={app.bundleId}
                title={app.name}
                subtitle={app.sellerName}
                accessories={[
                  { text: app.version },
                  { text: formatPrice(app.price) },
                  { text: releaseDate },
                  { text: ratingText },
                ]}
                icon={iconUrl ? { source: iconUrl } : Icon.AppWindow}
                detail={
                  <List.Item.Detail
                    markdown={`
                    # ${app.name} ${app.version}
                    
                    ${iconUrl ? `![App Icon](${iconUrl})` : ""}
                    
                    **Developer:** ${app.sellerName}
                    
                    **Price:** ${formatPrice(app.price)}
                    
                    **Rating:** ${ratingText}
                    
                    **Bundle ID:** \`${app.bundleId}\`
                    
                    **Release Date:** ${releaseDate}
                    
                    **Genre:** ${app.genres?.join(", ") || "Not available"}
                    
                    ## Description
                    ${app.description || "No description available"}
                    `}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={app.name} />
                        <List.Item.Detail.Metadata.Label title="Version" text={app.version} />
                        <List.Item.Detail.Metadata.Label title="Developer" text={app.sellerName} />
                        <List.Item.Detail.Metadata.Label title="Price" text={formatPrice(app.price)} />
                        <List.Item.Detail.Metadata.Label title="Rating" text={ratingText} />
                        <List.Item.Detail.Metadata.Label title="Bundle ID" text={app.bundleId} />
                        <List.Item.Detail.Metadata.Label title="Release Date" text={releaseDate} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <AppActionPanel
                    app={app}
                    onDownload={() => downloadApp(app.bundleId, app.name, app.version, app.price, true)}
                    showViewDetails={true}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
