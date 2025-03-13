import { ActionPanel, Action, List, Icon, Cache } from "@raycast/api";
import { useAtom } from "jotai";
import { sessionTokenAtom } from "./states/session-token.state";
import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import { LoginView } from "./views/LoginView";
import useAvailableBrowsers from "./browser-bookmark-hooks/useAvailableBrowsers";
import { BROWSERS_BUNDLE_ID } from "./browser-bookmark-hooks/useAvailableBrowsers";
import { BookmarksImportFromBrowserView } from "./views/BookmarksToImportFromBrowserView";
import { useState } from "react";
import { useEffect } from "react";
import { useMe } from "./hooks/use-me.hook";

const cache = new Cache();

function Body() {
  const [sessionToken] = useAtom(sessionTokenAtom);
  const { data: availableBrowsers, isLoading } = useAvailableBrowsers();
  const me = useMe(sessionToken);

  // Get browser icon from bundle ID
  const getBrowserIcon = (bundleId: string): string => {
    switch (bundleId) {
      case BROWSERS_BUNDLE_ID.chrome:
        return "chrome.png";
      case BROWSERS_BUNDLE_ID.chromeBeta:
        return "chrome-beta.png";
      case BROWSERS_BUNDLE_ID.chromeDev:
        return "chrome-dev.png";
      case BROWSERS_BUNDLE_ID.safari:
        return "safari.png";
      case BROWSERS_BUNDLE_ID.firefox:
        return "firefox.png";
      case BROWSERS_BUNDLE_ID.firefoxDev:
        return "firefox-dev.png";
      case BROWSERS_BUNDLE_ID.arc:
        return "arc.png";
      case BROWSERS_BUNDLE_ID.brave:
        return "brave.png";
      case BROWSERS_BUNDLE_ID.braveBeta:
        return "brave-beta.png";
      case BROWSERS_BUNDLE_ID.braveNightly:
        return "brave-nightly.png";
      case BROWSERS_BUNDLE_ID.edge:
        return "edge.png";
      case BROWSERS_BUNDLE_ID.edgeDev:
        return "edge-dev.png";
      case BROWSERS_BUNDLE_ID.edgeCanary:
        return "edge-canary.png";
      case BROWSERS_BUNDLE_ID.zen:
        return "zen.png";
      case BROWSERS_BUNDLE_ID.vivaldi:
        return "vivaldi.png";
      case BROWSERS_BUNDLE_ID.island:
        return "island.png";
      case BROWSERS_BUNDLE_ID.sidekick:
        return "sidekick.png";
      case BROWSERS_BUNDLE_ID.prismaAccess:
        return "prisma-access.png";
      case BROWSERS_BUNDLE_ID.whale:
        return "whale.png";
      default:
        return "globe.png";
    }
  };

  const [after1Sec, setAfter1Sec] = useState(false);
  useEffect(() => {
    // If this is not here, LoginView will briefly appear.
    setTimeout(() => setAfter1Sec(true), 1000);
  }, []);

  const loggedOutStatus = !sessionToken && after1Sec;
  useEffect(() => {
    // Clear data when logged out.
    if (loggedOutStatus) {
      cache.remove("me");
      cache.remove("bookmarks");
    }
  }, [loggedOutStatus]);

  if (loggedOutStatus) {
    return <LoginView />;
  }

  if (!me.data) {
    return <List isLoading={true} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search browsers..."
      navigationTitle="Select Which Bookmarks to Import"
    >
      <List.Section title="From Browser">
        {availableBrowsers?.map((browser) => {
          return (
            <List.Item
              key={browser.bundleId}
              title={browser.name}
              icon={{ source: getBrowserIcon(browser.bundleId as string) }}
              actions={
                <ActionPanel title={`Import Bookmarks from ${browser.name}`}>
                  <ActionPanel.Submenu title="Add Label">
                    <ActionPanel.Section title="Which Space to Import Bookmarks">
                      {me.data.associatedSpaces.map((s) => {
                        return (
                          <Action.Push
                            key={s.id}
                            title={s.name}
                            icon={s.image ? { source: s.image } : s.type === "TEAM" ? Icon.TwoPeople : Icon.Person}
                            target={
                              <BookmarksImportFromBrowserView space={s} selectedBrowser={browser.bundleId as string} />
                            }
                          />
                        );
                      })}
                    </ActionPanel.Section>
                  </ActionPanel.Submenu>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// The main component that will be the default export
export default function Command() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
