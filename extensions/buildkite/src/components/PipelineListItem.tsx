import { ActionPanel, Color, getPreferenceValues, Icon, List, Action } from "@raycast/api";
import { getStateIcon, State } from "../utils/states";
import { Pager } from "../utils/types";
import { Builds } from "./Builds";

export interface Pipeline {
  slug: string;
  name: string;
  description: string;
  favorite: boolean;
  url: string;
  builds: Pager<{ state: State }>;
}

interface PipelineListItemProps {
  pipeline: Pipeline;
}

export function PipelineListItem({ pipeline }: PipelineListItemProps) {
  const { org } = getPreferenceValues();
  const state = pipeline.builds.edges[0]?.node.state;
  const favoriteIcon = pipeline.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined;

  return (
    <List.Item
      id={pipeline.slug}
      title={pipeline.name}
      subtitle={pipeline.description}
      icon={getStateIcon(state)}
      accessories={[{ icon: favoriteIcon }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={pipeline.url} />
          <Action.CopyToClipboard content={pipeline.url} title="Copy URL" />
          <Action.Push
            icon={Icon.Eye}
            target={<Builds pipeline={`${org}/${pipeline.slug}`} />}
            title="View Builds"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
