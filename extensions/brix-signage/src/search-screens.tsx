import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { cacheImage, consoleUrl, failToast, getPage } from "./api";
import { contentText, relative, statusIcon, statusText } from "./format";
import { ChooseContent } from "./pickers";
import { ScreenCommandActions } from "./screen-actions";
import { CONTENT_KIND_LABEL, Screen } from "./types";

const PAGE = 100;

export default function SearchScreens() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (q: string) => async (options: { cursor?: string }) => {
      const page = await getPage<Screen>("/v1/screens", { q: q || undefined, limit: PAGE, cursor: options.cursor });
      return { data: page.data, hasMore: !!page.nextCursor, cursor: page.nextCursor ?? undefined };
    },
    [search],
    { keepPreviousData: true, onError: failToast("Could not load screens") },
  );

  const screens = (data ?? []).filter((s) => status === "all" || s.status === status);

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
      <List.EmptyView
        icon={Icon.Monitor}
        title={search ? "No screens match the search" : "No screens"}
        description={search ? "Try a different name." : "Add a screen in Brix to see it here."}
      />
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
    (id: string, at: string | null) =>
      at ? cacheImage(`/v1/screens/${encodeURIComponent(id)}/live-thumbnail`, `screen-${id}`) : Promise.resolve(null),
    [screen.id, screen.liveThumbnailAt],
    { onError: () => undefined },
  );
  const markdown = image
    ? `![${screen.name}](${encodeURI(`file://${image}`)}?raycast-height=200)`
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
