import { useState, useEffect, useCallback, useRef } from "react";
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
  getApiKey,
  authorizeWithOAuth,
  IconHit,
  ApiUsage,
  getApiUsage,
  signOut,
  isUsingPreferenceKey,
} from "./api";
import ChangeAppIcon from "./change-icon";

function formatDownloads(count: number): string {
  if (count >= 1000000) return `↓ ${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `↓ ${(count / 1000).toFixed(1)}K`;
  return `↓ ${count}`;
}

export default function Command() {
  const [columns, setColumns] = useState(8);
  const [searchText, setSearchText] = useState("");
  // null = loading, undefined = not signed in, string = signed in
  const [apiKey, setApiKey] = useState<string | undefined | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);
  const searchAbortController = useRef<AbortController>();
  const usingPreferenceKey = isUsingPreferenceKey();

  const loadUsage = useCallback(async (key: string) => {
    try {
      setApiUsage(await getApiUsage(key));
    } catch {
      // Usage is a nice-to-have; ignore failures.
    }
  }, []);

  useEffect(() => {
    // Only read an existing key on mount — never auto-open the browser.
    getApiKey()
      .then((key) => {
        setApiKey(key ?? undefined);
        if (key) loadUsage(key);
      })
      .catch(() => setApiKey(undefined));
  }, [loadUsage]);

  const {
    data: icons,
    isLoading,
    pagination,
  } = useCachedPromise(
    (query: string, key: string | undefined) =>
      async (paginationOptions: { page: number }) => {
        const result = await searchIcons(query, {
          page: paginationOptions.page + 1,
          hitsPerPage: 50,
          apiKey: key,
          signal: searchAbortController.current?.signal,
        });
        return {
          data: result.hits,
          hasMore: result.page < result.totalPages,
        };
      },
    [searchText, apiKey ?? undefined],
    {
      execute: typeof apiKey === "string",
      abortable: searchAbortController,
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

  async function handleSignIn() {
    setApiKey(null);
    try {
      const key = await authorizeWithOAuth();
      setApiKey(key);
      loadUsage(key);
    } catch (error) {
      setApiKey(undefined);
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign in failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleSignOut() {
    await signOut();
    setApiKey(undefined);
    setApiUsage(null);
    await showToast({ style: Toast.Style.Success, title: "Signed out" });
  }

  // Signed-out state: prompt the user to connect their account.
  if (apiKey === undefined) {
    return (
      <Grid columns={2} inset={Grid.Inset.Large}>
        <Grid.EmptyView
          icon={Icon.Person}
          title="Sign in to macOSicons.com"
          description="Connect your account to search and apply thousands of macOS icons. It's free — 50 requests/month."
          actions={
            <ActionPanel>
              <Action
                title="Sign in with Macosicons.com"
                icon={Icon.Globe}
                onAction={handleSignIn}
              />
              <Action.OpenInBrowser
                title="Create a Free Account"
                url="https://macosicons.com"
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      // useCachedPromise persists the first page between command runs. Keep
      // cached icons interactive while the latest results refresh in the
      // background instead of covering them with a loading indicator.
      isLoading={icons === undefined && (apiKey === null || isLoading)}
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
                ? `This month: ${apiUsage.currentMonthlyUsage.toLocaleString()}/${apiUsage.apiCallLimit.toLocaleString()} requests`
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
              {!usingPreferenceKey && (
                <Action
                  title="Sign out"
                  icon={Icon.Logout}
                  onAction={handleSignOut}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
