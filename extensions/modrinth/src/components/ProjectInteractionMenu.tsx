import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { MODRINTH_BASE_URL, SortingType, SortingTypes } from "../utils/constants";
import ProjectAPIResponseType from "../models/ProjectAPIResponseType";
import { ReactElement } from "react";
import VersionsListView from "../pages/VersionsListView";

export default function ProjectInteractionMenu({
  itemData,
  projectType,
  detailsTarget,
  setSortingType,
}: {
  itemData: ProjectAPIResponseType | null;
  projectType: string;
  detailsTarget?: ReactElement;
  setSortingType?: (sortOption: SortingType) => void;
}) {
  return (
    <ActionPanel title={`Options for ${itemData?.title}`} key={"general"}>
      {/* Section 1: General Actions */}
      <ActionPanel.Section>
        {detailsTarget && <Action.Push title={"View Details"} icon={Icon.Info} target={<>{detailsTarget}</>} />}
        <Action.OpenInBrowser url={`${MODRINTH_BASE_URL}${projectType}/${itemData?.slug}`} />
        {setSortingType && (
          <ActionPanel.Submenu
            title={"Sort by…"}
            icon={Icon.ArrowClockwise}
            shortcut={{ key: "s", modifiers: ["cmd"] }}
          >
            {Object.entries(SortingTypes).map(([key, { label }], index) => (
              <Action
                key={key}
                title={label}
                shortcut={{ key: `${(index + 1).toString() as Keyboard.KeyEquivalent}`, modifiers: ["cmd"] }}
                onAction={() => setSortingType?.(key as SortingType)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action.CopyToClipboard
          title={"Copy URL to Clipboard"}
          content={`${MODRINTH_BASE_URL}${projectType}/${itemData?.slug}`}
          shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
        />
        <Action.Push
          title={"View All Versions"}
          icon={Icon.BulletPoints}
          target={
            <VersionsListView
              slug={itemData?.slug ?? ""}
              name={itemData?.title ?? ""}
              loaders={itemData?.loaders ?? []}
              projectType={projectType}
            />
          }
          shortcut={{ key: "v", modifiers: ["cmd", "shift"] }}
        />
      </ActionPanel.Section>

      {/* Section 2: Link Quick-Access */}
      <ActionPanel.Section title={"Relevant Links"}>
        {itemData?.issues_url && (
          <Action.OpenInBrowser
            url={itemData?.issues_url ?? MODRINTH_BASE_URL}
            title={"Report Issues"}
            icon={Icon.Warning}
            shortcut={{ key: "i", modifiers: ["cmd", "shift"] }}
          />
        )}
        {itemData?.source_url && (
          <Action.OpenInBrowser
            url={itemData?.source_url ?? MODRINTH_BASE_URL}
            title={"View Source"}
            icon={Icon.Code}
            shortcut={{ key: "s", modifiers: ["cmd", "shift"] }}
          />
        )}
        {itemData?.discord_url && (
          <Action.OpenInBrowser
            url={itemData?.discord_url ?? MODRINTH_BASE_URL}
            title={"Join the Discord"}
            icon={Icon.SpeechBubble}
            shortcut={{ key: "d", modifiers: ["cmd", "shift"] }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
