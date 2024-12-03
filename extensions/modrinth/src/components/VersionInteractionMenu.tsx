import { Action, ActionPanel, Icon } from "@raycast/api";
import ModChangelogAPIResponse from "../models/ModChangelogAPIResponse";
import VersionsDetailView from "../pages/VersionsDetailView";

export default function VersionInteractionMenu(props: {
  data: ModChangelogAPIResponse;
  slug: string;
  showDetails?: boolean;
}) {
  return (
    <ActionPanel title={`Options for ${props.data.name}`}>
      {props.showDetails ? (
        <Action.Push
          title={"View Details"}
          icon={Icon.Info}
          target={<VersionsDetailView data={props.data} slug={props.slug} />}
        />
      ) : (
        <></>
      )}
      <Action.OpenInBrowser url={`https://modrinth.com/mod/${props.slug}/version/${props.data.id}`} />
      <Action.OpenInBrowser
        title={"Download File"}
        shortcut={{ key: "d", modifiers: ["cmd"] }}
        url={
          props.data.files.find((curr) => curr.primary)?.url ??
          `https://modrinth.com/mod/${props.slug}/version/${props.data.id}`
        }
        icon={Icon.Download}
      />
      <Action.CopyToClipboard
        title={"Copy URL to Clipboard"}
        shortcut={{ key: "c", modifiers: ["cmd"] }}
        content={`https://modrinth.com/mod/${props.slug}/version/${props.data.id}`}
      />
    </ActionPanel>
  );
}
