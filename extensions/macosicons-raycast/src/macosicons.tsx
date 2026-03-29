import { useState, useEffect } from "react";
import { ActionPanel, Action, Grid, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { searchIcons, ensureApiKey, IconHit, getApiUsage } from "./api";
import SignIn from "./sign-in";
import ChangeAppIcon from "./change-icon";

function formatDownloads(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M ↓`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K ↓`;
  return `${count} ↓`;
}

export default function Command() {
  const [columns, setColumns] = useState(5);
  const [searchText, setSearchText] = useState("");
  const [apiKey, setApiKey] = useState<string | undefined | null>(null); // null = loading
  const [totalUsage, setTotalUsage] = useState<number | null>(null);

  useEffect(() => {
    ensureApiKey()
      .then(async (key) => {
        setApiKey(key ?? undefined);
        if (!key) return;
        try {
          const usage = await getApiUsage(key);
          setTotalUsage(usage.totalUsage);
        } catch {
          // Skip usage display on error
        }
      })
      .catch(() => setApiKey(undefined));
  }, []);

  const {
    data: icons,
    isLoading,
    pagination,
  } = useCachedPromise(
    (query: string) => async (paginationOptions: { page: number }) => {
      const result = await searchIcons(query, {
        page: paginationOptions.page + 1,
        hitsPerPage: 50,
      });
      return {
        data: result.hits,
        hasMore: result.page < result.totalPages,
      };
    },
    [searchText],
    {
      execute: typeof apiKey === "string",
      keepPreviousData: true,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error.message,
        });
      },
    },
  );

  if (apiKey === undefined) {
    return <SignIn onSignIn={(key) => setApiKey(key)} />;
  }

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={apiKey === null || isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search macOS icons..."
      throttle
      pagination={pagination}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Section
            title={
              totalUsage !== null
                ? `API Usage: ${totalUsage.toLocaleString()} requests`
                : "Grid Size"
            }
          >
            <Grid.Dropdown.Item title="Large" value={"3"} />
            <Grid.Dropdown.Item title="Medium" value={"5"} />
            <Grid.Dropdown.Item title="Small" value={"8"} />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {apiKey && icons?.length === 0 && !isLoading && searchText.trim() && (
        <Grid.EmptyView
          title="No Icons Found"
          description={`No results for "${searchText}"`}
        />
      )}
      {(icons as IconHit[] | undefined)?.map((icon) => (
        <Grid.Item
          key={icon.objectID}
          content={{
            value: { source: icon.lowResPngUrl },
            tooltip: icon.appName,
          }}
          title={icon.appName}
          subtitle={`${icon.usersName} · ${formatDownloads(icon.downloads)}`}
          actions={
            <ActionPanel>
              {icon.icnsUrl && (
                <Action.Push
                  title="Change App Icon"
                  target={
                    <ChangeAppIcon
                      icnsUrl={icon.icnsUrl}
                      iconName={icon.appName}
                      initialSearchText={searchText}
                    />
                  }
                />
              )}
              {icon.icnsUrl && (
                <Action.OpenInBrowser
                  title="Download ICNS"
                  url={icon.icnsUrl}
                />
              )}
              {icon.lowResPngUrl && (
                <Action.CopyToClipboard
                  title="Copy Image URL"
                  content={icon.lowResPngUrl}
                />
              )}
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://macosicons.com/?icon=${icon.objectID}`}
              />
              <Action.CopyToClipboard
                title="Copy App Name"
                content={icon.appName}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
