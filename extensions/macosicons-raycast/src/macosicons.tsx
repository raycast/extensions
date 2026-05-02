import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  searchIcons,
  ensureApiKey,
  IconHit,
  getApiUsage,
  signOut,
  authorizeWithOAuth,
} from "./api";
import ChangeAppIcon from "./change-icon";

function formatDownloads(count: number): string {
  if (count >= 1000000) return `↓ ${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `↓ ${(count / 1000).toFixed(1)}K`;
  return `↓ ${count}`;
}

type ApiUsageResponse = {
  dailyUsage: number;
  currentMonthlyUsage: number;
  totalUsage: number;
  apiCallLimit: number;
};

export default function Command() {
  const [columns, setColumns] = useState(8);
  const [searchText, setSearchText] = useState("");
  const [apiKey, setApiKey] = useState<string | undefined | null>(null); // null = loading
  const [apiUsage, setApiUsage] = useState<ApiUsageResponse | null>(null);

  useEffect(() => {
    ensureApiKey()
      .then(async (key) => {
        setApiKey(key ?? undefined);
        if (!key) return;
        try {
          const usage = await getApiUsage(key);
          setApiUsage(usage);
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

  async function handleSignOut() {
    await signOut();
    await showToast({ style: Toast.Style.Success, title: "Signed out" });
    setApiKey(null);
    try {
      const key = await authorizeWithOAuth();
      setApiKey(key);
    } catch {
      setApiKey(undefined);
    }
  }

  // if (apiKey === undefined) {
  //   return <SignIn onSignIn={(key) => setApiKey(key)} />;
  // }

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
              apiUsage !== null
                ? `This month's usage: ${apiUsage.currentMonthlyUsage.toLocaleString()}/${apiUsage.apiCallLimit.toLocaleString()}`
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
      {(icons as IconHit[] | undefined)?.map((icon, idx) => (
        <Grid.Item
          key={`${icon.objectID}-${idx}`}
          content={{
            value: { source: icon.lowResPngUrl },
            tooltip: icon.appName,
          }}
          title={icon.appName}
          subtitle={`${formatDownloads(icon.downloads)} · @${icon.usersName}`}
          actions={
            <ActionPanel>
              {icon.icnsUrl && (
                <Action.Push
                  title="Change App Icon"
                  icon={Icon.AppWindowGrid2x2}
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
                  icon={Icon.Download}
                  url={icon.icnsUrl}
                />
              )}
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://macosicons.com/?icon=${icon.objectID}`}
              />
              {icon.lowResPngUrl && (
                <Action.CopyToClipboard
                  title="Copy Image URL"
                  content={icon.lowResPngUrl}
                />
              )}
              <Action.OpenInBrowser
                title="View User Icons"
                url={`https://macosicons.com/u/${icon.usersName}`}
              />
              <Action.CopyToClipboard
                title="Copy App Name"
                content={icon.appName}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Sign out"
                onAction={handleSignOut}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
