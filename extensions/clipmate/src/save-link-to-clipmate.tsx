import { List, ActionPanel, Action, Icon, Color, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getFavicon } from "@raycast/utils";
import { initiateAuthFlow, isAuthenticated, signOut } from "./services/authentication";
import { CollectionPicker } from "./components/CollectionPicker";
import { PageInfo } from "./types";
import { isValidUrl, normalizeUrl, getPageInfo } from "./utils/url";

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string>("");
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [manualPageInfo, setManualPageInfo] = useState<PageInfo | null>(null);
  const [manualFaviconUrl, setManualFaviconUrl] = useState<string | null>(null);
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout>();
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Skip authentication check and directly proceed to the second page
  useEffect(() => {
    async function checkAuth() {
      try {
        setCheckingAuth(true);
        const isAuth = await isAuthenticated();
        setAuthenticated(isAuth);

        // If not authenticated, automatically initiate auth flow
        if (!isAuth) {
          await handleSignIn();
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  // Handle sign in
  const handleSignIn = async () => {
    await initiateAuthFlow();
    const isAuth = await isAuthenticated();
    setAuthenticated(isAuth);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      // Reset authentication state
      setAuthenticated(false);
      // Trigger the authentication flow again
      await handleSignIn();
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  // Handle manual URL input
  useEffect(() => {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }

    if (manualUrl && isValidUrl(manualUrl)) {
      const timeout = setTimeout(async () => {
        try {
          const normalizedUrl = normalizeUrl(manualUrl);
          // Set fallback favicon while fetching rich preview
          setManualFaviconUrl(getFavicon(normalizedUrl) as string);
          const info = await getPageInfo(normalizedUrl);
          setManualPageInfo(info);
        } catch (e) {
          setManualFaviconUrl(null);
          setManualPageInfo(null);
        }
      }, 500);

      setFetchTimeout(timeout);
    } else {
      setManualFaviconUrl(null);
      setManualPageInfo(null);
    }

    return () => {
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
    };
  }, [manualUrl]);

  // Get clipboard contents and metadata
  useEffect(() => {
    async function init() {
      try {
        const text = await Clipboard.readText();
        setClipboardText(text || "");

        if (text && isValidUrl(text)) {
          try {
            const normalizedUrl = normalizeUrl(text);
            // Set fallback favicon while fetching rich preview
            setFaviconUrl(getFavicon(normalizedUrl) as string);
            const info = await getPageInfo(normalizedUrl);
            setPageInfo(info);
          } catch (e) {
            setFaviconUrl(null);
            setPageInfo(null);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const isClipboardValid = isValidUrl(clipboardText);
  const isManualValid = isValidUrl(manualUrl);

  // Helper function to safely normalize URLs
  const safeNormalizeUrl = (url: string): string => {
    try {
      return normalizeUrl(url);
    } catch {
      return url;
    }
  };

  if (checkingAuth) {
    return (
      <List isLoading={true}>
        <List.EmptyView title="Setting up Clipmate..." />
      </List>
    );
  }

  // Bypass authentication screen and show loading instead
  if (!authenticated) {
    return (
      <List isLoading={true}>
        <List.EmptyView title="Signing you in..." />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Save to Clipmate"
      searchBarPlaceholder="Enter a URL manually..."
      onSearchTextChange={setManualUrl}
      searchText={manualUrl}
    >
      {/* Clipboard URL Section */}
      {clipboardText && (
        <List.Section title="From Clipboard">
          <List.Item
            title={(() => {
              if (!isClipboardValid) return "Invalid URL";
              try {
                return pageInfo?.title || new URL(normalizeUrl(clipboardText)).hostname;
              } catch {
                return clipboardText;
              }
            })()}
            subtitle={(() => {
              if (!isClipboardValid) return clipboardText;
              if (pageInfo?.description) {
                return `${clipboardText} • ${pageInfo.description.slice(0, 100)}${pageInfo.description.length > 100 ? "..." : ""}`;
              }
              return clipboardText;
            })()}
            icon={{
              source: pageInfo?.favicon || pageInfo?.image || faviconUrl || Icon.Link,
              fallback: Icon.Link,
            }}
            accessories={[
              ...(pageInfo?.siteName ? [{ text: pageInfo.siteName }] : []),
              { text: isClipboardValid ? "Valid URL" : "Invalid URL" },
              {
                icon: {
                  source: isClipboardValid ? Icon.CheckCircle : Icon.XMarkCircle,
                  tintColor: isClipboardValid ? Color.Green : Color.Red,
                },
              },
            ]}
            actions={
              isClipboardValid ? (
                <ActionPanel>
                  <Action.Push
                    title="Continue"
                    target={<CollectionPicker link={safeNormalizeUrl(clipboardText)} />}
                    icon={Icon.ArrowRight}
                  />
                  <Action.OpenInBrowser url={safeNormalizeUrl(clipboardText)} />
                  <Action
                    title="Sign Out"
                    onAction={handleSignOut}
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        </List.Section>
      )}

      {/* Manual URL Section */}
      {manualUrl && (
        <List.Section title="Manual Entry">
          <List.Item
            title={(() => {
              if (!isManualValid) return manualUrl;
              try {
                return manualPageInfo?.title || new URL(normalizeUrl(manualUrl)).hostname;
              } catch {
                return manualUrl;
              }
            })()}
            subtitle={(() => {
              if (!isManualValid) return manualUrl;
              if (manualPageInfo?.description) {
                return `${manualUrl} • ${manualPageInfo.description.slice(0, 100)}${manualPageInfo.description.length > 100 ? "..." : ""}`;
              }
              return manualUrl;
            })()}
            icon={{
              source: manualPageInfo?.favicon || manualPageInfo?.image || manualFaviconUrl || Icon.Link,
              fallback: Icon.Link,
            }}
            accessories={[
              ...(manualPageInfo?.siteName ? [{ text: manualPageInfo.siteName }] : []),
              { text: isManualValid ? "Valid URL" : "Invalid URL" },
              {
                icon: {
                  source: isManualValid ? Icon.CheckCircle : Icon.XMarkCircle,
                  tintColor: isManualValid ? Color.Green : Color.Red,
                },
              },
            ]}
            actions={
              isManualValid ? (
                <ActionPanel>
                  <Action.Push
                    title="Continue"
                    target={<CollectionPicker link={safeNormalizeUrl(manualUrl)} />}
                    icon={Icon.ArrowRight}
                  />
                  <Action.OpenInBrowser url={safeNormalizeUrl(manualUrl)} />
                  <Action
                    title="Sign Out"
                    onAction={handleSignOut}
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        </List.Section>
      )}

      {/* Empty State */}
      {!clipboardText && !manualUrl && !isLoading && (
        <List.EmptyView
          title="Ready to Save Links!"
          description="Copy a URL to your clipboard or start typing above to enter one manually"
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action
                title="Sign Out"
                onAction={handleSignOut}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
