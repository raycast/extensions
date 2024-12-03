import { Action, ActionPanel, Icon } from "@raycast/api";
import VersionsListView from "../pages/VersionsListView";
import ProjectAPIResponseType from "../models/ProjectAPIResponseType";
import { ReactNode } from "react";

export default function ProjectInteractionMenu(props: {
  itemData: ProjectAPIResponseType | null;
  projectType: string;
  detailsTarget?: ReactNode;
}) {
  return (
    <ActionPanel title={`Options for ${props.itemData?.title}`} key={"general"}>
      <ActionPanel.Section>
        {props?.detailsTarget ? (
          <Action.Push title={"View Details"} icon={Icon.Info} target={props.detailsTarget} />
        ) : (
          <></>
        )}
        <Action.OpenInBrowser url={`https://modrinth.com/${props.projectType}/${props.itemData?.slug ?? ""}`} />
        <Action.CopyToClipboard
          title={"Copy URL to Clipboard"}
          shortcut={{ key: "c", modifiers: ["cmd"] }}
          content={`https://modrinth.com/${props.projectType}/${props.itemData?.slug ?? ""}`}
        />
        <Action.Push
          title={"View All Versions"}
          icon={Icon.BulletPoints}
          target={
            <VersionsListView
              slug={props.itemData?.slug ?? ""}
              name={props.itemData?.title ?? ""}
              loaders={props.itemData?.loaders ?? []}
              showDropdown={props.itemData?.project_type != "resourcepack"}
            />
          }
          shortcut={{ key: "v", modifiers: ["cmd"] }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title={"Relevant Links"}>
        {props.itemData?.issues_url == undefined || props.itemData?.issues_url.length == 0 ? (
          <></>
        ) : (
          <Action.OpenInBrowser
            url={props.itemData?.issues_url ?? ""}
            title={"Report Issues"}
            icon={Icon.Warning}
            shortcut={{ key: "i", modifiers: ["cmd"] }}
          />
        )}
        {props.itemData?.source_url == undefined || props.itemData?.source_url.length == 0 ? (
          <></>
        ) : (
          <Action.OpenInBrowser
            url={props.itemData!.source_url}
            title={"View Source"}
            icon={Icon.Code}
            shortcut={{ key: "s", modifiers: ["cmd"] }}
          />
        )}
        {props.itemData?.discord_url == undefined || props.itemData?.discord_url.length == 0 ? (
          <></>
        ) : (
          <Action.OpenInBrowser
            url={props.itemData!.discord_url}
            title={"Join the Discord"}
            icon={Icon.SpeechBubble}
            shortcut={{ key: "d", modifiers: ["cmd"] }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
