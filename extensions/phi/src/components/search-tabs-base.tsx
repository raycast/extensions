import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import {
  PhiCommandName,
  runPhiCommand,
  runPhiCommandAction,
} from "../command-compatibility";
import {
  activateTab,
  closeTab,
  getSpaces,
  getTabs,
  openBookmark,
  openPinnedTab,
  reloadTab,
  TabScope,
} from "../phi";
import { PhiBookmark, PhiPinnedTab, PhiSpace, PhiTab } from "../types";
import { resolveSpaceIcon } from "../space-icon";
import {
  hasTabSearchResults,
  pinnedTabDisplaySpace,
  removeTabFromSearchData,
  resolveTabFaviconURL,
  TabSearchData,
} from "../tab-utils";
import { formatURLHost, formatURLHosts } from "../url-utils";
import { runViewAction } from "../window-command";
import { PhiErrorView } from "./error-view";

interface Props {
  command: PhiCommandName;
  scope: TabScope;
}

function titleWithSecondary(
  title: string,
  secondary: { title: string } | null,
): string {
  const primary = title || "Untitled";
  return secondary ? `${primary} • ${secondary.title || "Untitled"}` : primary;
}

function subtitleWithSecondary(
  url: string | null,
  secondary: { url: string | null } | null,
): string | undefined {
  return formatURLHosts([url, secondary?.url]);
}

function keywordsWithSecondary(
  url: string | null,
  secondary: { url: string | null } | null,
): string[] | undefined {
  const values = [url, secondary?.url].filter((value): value is string =>
    Boolean(value),
  );
  return values.length > 0 ? values : undefined;
}

function spaceById(spaces: PhiSpace[]): Map<string, PhiSpace> {
  return new Map(spaces.map((space) => [space.id, space]));
}

function pinTargetSpaces(
  pin: PhiPinnedTab,
  spaces: PhiSpace[],
  targetSpaceId: string | null,
): PhiSpace[] {
  const available = new Set(pin.spaceIds);
  const filtered = spaces.filter((space) => available.has(space.id));
  if (targetSpaceId) {
    return filtered.filter((space) => space.id === targetSpaceId);
  }
  return [...filtered].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }
    if (left.isOpen !== right.isOpen) {
      return left.isOpen ? -1 : 1;
    }
    return pin.spaceIds.indexOf(left.id) - pin.spaceIds.indexOf(right.id);
  });
}

export function SearchTabsBase({ command, scope }: Props) {
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(
    async (
      requestedCommand: PhiCommandName,
      requestedScope: TabScope,
    ): Promise<TabSearchData> =>
      runPhiCommand(requestedCommand, async () => {
        const [results, spaces] = await Promise.all([
          getTabs(requestedScope),
          getSpaces(),
        ]);
        return { ...results, spaces };
      }),
    [command, scope],
  );

  if (error) {
    return <PhiErrorView error={error} onRetry={revalidate} />;
  }

  const tabs = data?.tabs ?? [];
  const pinnedTabs = data?.pinnedTabs ?? [];
  const bookmarks = data?.bookmarks ?? [];
  const spaces = data?.spaces ?? [];
  const spacesById = spaceById(spaces);
  const hasResults = hasTabSearchResults({ tabs, pinnedTabs, bookmarks });

  async function close(tab: PhiTab) {
    await runViewAction(
      async () => {
        await mutate(
          runPhiCommandAction(command, "close-tab", () => closeTab(tab)),
          {
            optimisticUpdate: (current) =>
              current ? removeTabFromSearchData(current, tab) : current,
            rollbackOnError: true,
            shouldRevalidateAfter: false,
          },
        );
      },
      "Could Not Close Tab",
      "Refresh and try again.",
    );
  }

  async function perform(
    title: string,
    actionName: string,
    action: () => Promise<void>,
  ) {
    await runViewAction(
      () => runPhiCommandAction(command, actionName, action),
      title,
      "Refresh and try again.",
    );
  }

  function iconFor(url: string | null) {
    const faviconURL = resolveTabFaviconURL(url);
    return faviconURL
      ? getFavicon(faviconURL, { fallback: Icon.Globe })
      : Icon.Globe;
  }

  function copyActions(
    primaryURL: string | null,
    secondary: { url: string | null } | null,
  ) {
    return (
      <>
        {primaryURL ? (
          <Action.CopyToClipboard
            content={primaryURL}
            title={secondary ? "Copy Primary URL" : "Copy URL"}
          />
        ) : null}
        {secondary?.url ? (
          <Action.CopyToClipboard
            content={secondary.url}
            title="Copy Secondary URL"
          />
        ) : null}
      </>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by title or URL">
      {tabs.length > 0 ? (
        <List.Section title="Open Tabs">
          {tabs.map((tab) => (
            <List.Item
              key={`opened:${tab.windowId}:${tab.id}`}
              title={tab.title || "Untitled Tab"}
              subtitle={formatURLHost(tab.url)}
              keywords={tab.url ? [tab.url] : undefined}
              icon={iconFor(tab.url)}
              accessories={[
                ...(tab.isActive
                  ? [
                      {
                        icon: {
                          source: Icon.Dot,
                          tintColor: Color.Green,
                        },
                        tooltip: "Active",
                      },
                    ]
                  : []),
                {
                  text: spacesById.get(tab.spaceId)?.title ?? "Space",
                  icon: resolveSpaceIcon(spacesById.get(tab.spaceId)?.iconData),
                },
                ...(tab.isPinned
                  ? [{ icon: Icon.Pin, tooltip: "Pinned" }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Activate Tab"
                    icon={Icon.Window}
                    onAction={() =>
                      perform("Could Not Activate Tab", "activate-tab", () =>
                        activateTab(tab),
                      )
                    }
                  />
                  {copyActions(tab.url, null)}
                  <Action
                    title="Reload Tab"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      perform("Could Not Reload Tab", "reload-tab", () =>
                        reloadTab(tab),
                      )
                    }
                  />
                  <Action
                    title="Close Tab"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => close(tab)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {pinnedTabs.length > 0 ? (
        <List.Section title="Pinned Tabs">
          {pinnedTabs.map((pin) => {
            const targets = pinTargetSpaces(
              pin,
              spaces,
              data?.targetSpaceId ?? null,
            );
            const subtitle = subtitleWithSecondary(pin.url, pin.secondary);
            const displaySpace = pinnedTabDisplaySpace(pin, targets);
            return (
              <List.Item
                key={`pin:${pin.id}`}
                title={titleWithSecondary(pin.title, pin.secondary)}
                subtitle={subtitle}
                keywords={keywordsWithSecondary(pin.url, pin.secondary)}
                icon={iconFor(pin.url)}
                accessories={
                  displaySpace
                    ? [
                        {
                          text: displaySpace.title,
                          icon:
                            resolveSpaceIcon(displaySpace.iconData) ?? Icon.Pin,
                        },
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    {targets.map((space, index) => (
                      <Action
                        key={space.id}
                        title={
                          targets.length === 1
                            ? "Open Pinned Tab"
                            : `Open in ${space.title}`
                        }
                        icon={index === 0 ? Icon.Pin : Icon.Window}
                        onAction={() =>
                          perform(
                            "Could Not Open Pinned Tab",
                            "open-pinned-tab",
                            () => openPinnedTab(space.id, pin.id),
                          )
                        }
                      />
                    ))}
                    {copyActions(pin.url, pin.secondary)}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}

      {bookmarks.length > 0 ? (
        <List.Section title="Bookmarks">
          {bookmarks.map((bookmark: PhiBookmark) => {
            const subtitle = subtitleWithSecondary(
              bookmark.url,
              bookmark.secondary,
            );
            const space = spacesById.get(bookmark.spaceId);
            return (
              <List.Item
                key={`bookmark:${bookmark.spaceId}:${bookmark.id}`}
                title={titleWithSecondary(bookmark.title, bookmark.secondary)}
                subtitle={subtitle}
                keywords={keywordsWithSecondary(
                  bookmark.url,
                  bookmark.secondary,
                )}
                icon={iconFor(bookmark.url)}
                accessories={[
                  {
                    text: space?.title ?? "Space",
                    icon: resolveSpaceIcon(space?.iconData) ?? Icon.Bookmark,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open Bookmark"
                      icon={Icon.Bookmark}
                      onAction={() =>
                        perform(
                          "Could Not Open Bookmark",
                          "open-bookmark",
                          () => openBookmark(bookmark.spaceId, bookmark.id),
                        )
                      }
                    />
                    {copyActions(bookmark.url, bookmark.secondary)}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
      {!hasResults && !isLoading ? (
        <List.EmptyView
          title="No Tabs Found"
          description="No open tabs, pinned tabs, or bookmarks were found."
          icon={Icon.AppWindowList}
        />
      ) : null}
    </List>
  );
}
