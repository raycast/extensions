import { Action, ActionPanel, Icon } from "@raycast/api";
import ModChangelogAPIResponse from "../models/ModChangelogAPIResponse";
import { MODRINTH_BASE_URL } from "../utils/constants";
import VersionsDetailView from "../pages/VersionsDetailView";

export default function VersionInteractionMenu({
  data,
  slug,
  projectType,
  showDetails,
}: {
  data: ModChangelogAPIResponse;
  slug: string;
  projectType: string;
  showDetails?: boolean;
}) {
  return (
    <ActionPanel title={`Options for ${data.name}`}>
      {showDetails && (
        <Action.Push
          title={"View Details"}
          icon={Icon.Info}
          target={<VersionsDetailView data={data} slug={slug} projectType={projectType} />}
        />
      )}
      <Action.OpenInBrowser url={`${MODRINTH_BASE_URL}${projectType}/${slug}/version/${data.id}`} />
      <Action.OpenInBrowser
        title={"Download File"}
        shortcut={{ key: "d", modifiers: ["cmd"] }}
        url={
          data.files.find((curr) => curr.primary)?.url ?? `${MODRINTH_BASE_URL}${projectType}${slug}/version/${data.id}`
        }
        icon={Icon.Download}
      />
      <Action.CopyToClipboard
        title={"Copy URL to Clipboard"}
        shortcut={{ key: "c", modifiers: ["cmd"] }}
        content={`${MODRINTH_BASE_URL}${projectType}/${slug}/version/${data.id}`}
      />
    </ActionPanel>
  );
}
