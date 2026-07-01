import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { BuildFragment } from "../generated/graphql";
import { timeAgo } from "../utils/format";
import { getStateIcon } from "../utils/states";
import { BuildDetails } from "./BuildDetails";

interface BuildListItemProps {
  build: BuildFragment;
}

export function BuildListItem({ build }: BuildListItemProps) {
  return (
    <List.Item
      id={build.id}
      title={build.message ?? ""}
      subtitle={build.pipeline?.name ?? `#${build.number}`}
      icon={getStateIcon(build.state)}
      keywords={[build.pipeline?.name || "", build.number.toString()]}
      accessories={[{ text: timeAgo(build.createdAt) }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={build.url} />
          <Action.CopyToClipboard content={build.url} title="Copy URL" />
          <Action.Push
            title="Show Build Graph"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            target={<BuildDetails build={build} />}
          />
        </ActionPanel>
      }
    />
  );
}
