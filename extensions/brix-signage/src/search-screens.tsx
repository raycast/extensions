import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { accountId, cacheImage, consoleUrl, getPage, sameAccount } from "./api";
import { ErrorView } from "./error-view";
import { contentText, relative, statusIcon, statusText } from "./format";
import { ChooseContent } from "./pickers";
import { ScreenCommandActions } from "./screen-actions";
import { CONTENT_KIND_LABEL, Screen } from "./types";

const PAGE = 100;
/** With a status filter, read at most this many screens to fill one page. */
const FILTER_SCAN_MAX = 2000;

/**
 * One page of screens. The API has no status filter, so with a status set
 * this reads on until it has a page of matches or reaches the end. The status
 * filter then covers every screen, not only the pages already loaded.
 */
async function screensPage(q: string, status: string, cursor: string | undefined) {
  const out: Screen[] = [];
  let next: string | null | undefined = cursor;
  let read = 0;
  do {
    const page: { data: Screen[]; nextCursor: string | null } = await getPage<Screen>("/v1/screens", {
      q: q || undefined,
      limit: PAGE,
      cursor: next ?? undefined,
    });
    read += page.data.length;
    out.push(...page.data.filter((s) => status === "all" || s.status === status));
    next = page.nextCursor;
  } while (next && status !== "all" && out.length < PAGE && read < FILTER_SCAN_MAX);
  return { data: out, hasMore: !!next, cursor: next ?? undefined };
}

export default function SearchScreens() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(
    // The account id is not used in the call: it keeps each key's lists apart in the cache.
    (account: string, q: string, st: string) => async (options: { cursor?: string }) => {
      sameAccount(account);
      return screensPage(q, st, options.cursor);
    },
    [accountId(), search, status],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load screens" } },
  );

  const screens = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search screens by name"
      onSearchTextChange={setSearch}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Status" storeValue onChange={setStatus}>
          <List.Dropdown.Item title="All Screens" value="all" />
          <List.Dropdown.Item title="Online" value="online" icon={Icon.CircleFilled} />
          <List.Dropdown.Item title="Offline" value="offline" icon={Icon.Circle} />
          <List.Dropdown.Item title="Not Paired" value="pairing" icon={Icon.CircleProgress} />
        </List.Dropdown>
      }
    >
      {error && screens.length === 0 ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Monitor}
          title={search || status !== "all" ? "No screens match" : "No screens"}
          description={
            search || status !== "all" ? "Try a different name or status." : "Add a screen in Brix to see it here."
          }
        />
      )}
      {screens.map((screen) => (
        <List.Item
          key={screen.id}
          icon={statusIcon(screen)}
          title={screen.name}
          subtitle={showingDetail ? undefined : (screen.nodeName ?? undefined)}
          keywords={[screen.nodeName ?? "", ...(screen.tags ?? [])]}
          accessories={
            showingDetail
              ? undefined
              : [
                  ...(screen.activeCastId || screen.activeEmergencyId
                    ? [{ icon: Icon.Megaphone, tooltip: contentText(screen) ?? "" }]
                    : []),
                  { text: contentText(screen) ?? undefined, tooltip: "Content" },
                  { text: statusText(screen), tooltip: "Status" },
                ]
          }
          detail={showingDetail ? <ScreenDetail screen={screen} /> : undefined}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={showingDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  onAction={() => setShowingDetail((v) => !v)}
                />
                <Action.OpenInBrowser title="Open in Brix" url={consoleUrl.screen(screen.id)} />
                <Action.Push
                  title="Change Content"
                  icon={Icon.Switch}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<ChooseContent screen={screen} onDone={revalidate} />}
                />
              </ActionPanel.Section>
              <ScreenCommandActions screen={screen} onDone={revalidate} />
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Screen ID"
                  content={screen.id}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard title="Copy Link" content={consoleUrl.screen(screen.id)} />
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ScreenDetail({ screen }: { screen: Screen }) {
  const { data: image, isLoading } = useCachedPromise(
    (account: string, id: string, at: string | null) =>
      at
        ? cacheImage(`/v1/screens/${encodeURIComponent(id)}/live-thumbnail`, `${account}-screen-${id}`)
        : Promise.resolve(null),
    [accountId(), screen.id, screen.liveThumbnailAt],
    { onError: () => undefined },
  );
  const markdown = image
    ? `![${screen.name}](${image}?raycast-height=200)`
    : isLoading
      ? ""
      : "_No picture of this screen yet._";
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={statusText(screen)} icon={statusIcon(screen)} />
          {screen.nodeName ? <List.Item.Detail.Metadata.Label title="Location" text={screen.nodeName} /> : null}
          <List.Item.Detail.Metadata.Label
            title="Content"
            text={
              screen.contentKind
                ? `${CONTENT_KIND_LABEL[screen.contentKind] ?? screen.contentKind}${screen.contentName ? `: ${screen.contentName}` : ""}`
                : "None"
            }
          />
          {screen.castHeadline ? <List.Item.Detail.Metadata.Label title="Message" text={screen.castHeadline} /> : null}
          {screen.emergencyHeadline ? (
            <List.Item.Detail.Metadata.Label title="Emergency" text={screen.emergencyHeadline} />
          ) : null}
          {screen.lastSeenAt ? (
            <List.Item.Detail.Metadata.Label title="Last Seen" text={relative(screen.lastSeenAt)} />
          ) : null}
          {screen.liveThumbnailAt ? (
            <List.Item.Detail.Metadata.Label title="Picture Taken" text={relative(screen.liveThumbnailAt)} />
          ) : null}
          {screen.timezone ? <List.Item.Detail.Metadata.Label title="Time Zone" text={screen.timezone} /> : null}
          {screen.tags && screen.tags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {screen.tags.map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Screen ID" text={screen.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
