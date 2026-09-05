import { useRef, useState } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  searchIcons,
  getApiKey,
  authorizeWithOAuth,
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const searchAbortController = useRef<AbortController | undefined>(undefined);
  const usingPreferenceKey = isUsingPreferenceKey();

  const {
    data: apiKey,
    isLoading: isLoadingKey,
    revalidate: revalidateApiKey,
  } = useCachedPromise(getApiKey);

  const { data: apiUsage } = useCachedPromise(
    (key: string) => getApiUsage(key),
    [apiKey ?? ""],
    {
      execute: typeof apiKey === "string",
      keepPreviousData: true,
    },
  );

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
        await showFailureToast(error, { title: "Search Failed" });
      },
    },
  );

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await authorizeWithOAuth();
      await revalidateApiKey();
    } catch (error) {
      await showFailureToast(error, { title: "Sign In Failed" });
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    const confirmed = await confirmAlert({
      title: "Sign Out of macOSicons?",
      message: "You'll need to sign in again to search and apply icons.",
      primaryAction: {
        title: "Sign out",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await signOut();
    } catch (error) {
      await showFailureToast(error, {
        title: "Signed Out on This Device Only",
      });
    } finally {
      await revalidateApiKey();
    }
  }

  const signedOut = !isLoadingKey && !isSigningIn && !apiKey;

  if (signedOut) {
    return (
      <Grid columns={2} inset={Grid.Inset.Large}>
        <Grid.EmptyView
          icon={Icon.Person}
          title="Sign In to macOSicons.com"
          description="Connect your account to search and apply thousands of macOS icons. It's free — 50 requests/month."
          actions={
            <ActionPanel>
              <Action
                title="Sign in with MacOSicons.com"
                icon={Icon.Person}
                onAction={handleSignIn}
              />
              <Action.OpenInBrowser
                title="Create a Free Account"
                icon={Icon.Plus}
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
      isLoading={
        isSigningIn || isLoadingKey || (icons === undefined && isLoading)
      }
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search macOS icons..."
      throttle
      pagination={pagination}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          defaultValue="8"
          onChange={(newValue) => {
            setColumns(parseInt(newValue, 10));
          }}
        >
          <Grid.Dropdown.Section
            title={
              apiUsage !== undefined
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
      {typeof apiKey === "string" && icons?.length === 0 && !isLoading && (
        <Grid.EmptyView
          title={searchText.trim() ? "No Icons Found" : "Search macOSicons"}
          description={
            searchText.trim()
              ? `No results for "${searchText}"`
              : "Type an app name to browse thousands of macOS icons."
          }
        />
      )}
      {icons?.map((icon, idx) => (
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
                icon={Icon.Globe}
                url={`https://macosicons.com/?icon=${icon.objectID}`}
              />
              {icon.lowResPngUrl && (
                <Action.CopyToClipboard
                  title="Copy Image URL"
                  icon={Icon.Clipboard}
                  content={icon.lowResPngUrl}
                />
              )}
              <Action.OpenInBrowser
                title="View User Icons"
                icon={Icon.Person}
                url={`https://macosicons.com/u/${icon.usersName}`}
              />
              <Action.CopyToClipboard
                title="Copy App Name"
                icon={Icon.Text}
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
