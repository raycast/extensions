import { Color, Icon, List } from "@raycast/api";
import { WezTermTab } from "../types";
import { formatSize, getActivePane, shortenPath } from "../utils/formatting";

export function TabDetail({ tab }: { tab: WezTermTab }) {
  const activePane = getActivePane(tab);
  const paneCount = tab.panes.length;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Tab" text={tab.tabTitle} />
          <List.Item.Detail.Metadata.Label title="Workspace" text={tab.workspace} />
          <List.Item.Detail.Metadata.TagList title="Status">
            {tab.isActive ? (
              <List.Item.Detail.Metadata.TagList.Item text="Active" color={Color.Green} />
            ) : (
              <List.Item.Detail.Metadata.TagList.Item text="Inactive" color={Color.SecondaryText} />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Tab ID" text={String(tab.tabId)} />
          <List.Item.Detail.Metadata.Label title="Window ID" text={String(tab.windowId)} />
          <List.Item.Detail.Metadata.Label title="Panes" text={`${paneCount} pane${paneCount !== 1 ? "s" : ""}`} />
          <List.Item.Detail.Metadata.Separator />

          {activePane && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Current Directory"
                text={shortenPath(activePane.cwd)}
                icon={Icon.Folder}
              />
              <List.Item.Detail.Metadata.Label title="Process" text={activePane.title} icon={Icon.Terminal} />
              <List.Item.Detail.Metadata.Label
                title="Terminal Size"
                text={activePane.size ? formatSize(activePane.size) : "Unknown"}
              />
              {activePane.isZoomed && (
                <List.Item.Detail.Metadata.TagList title="Zoom">
                  <List.Item.Detail.Metadata.TagList.Item text="Zoomed" color={Color.Blue} />
                </List.Item.Detail.Metadata.TagList>
              )}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
