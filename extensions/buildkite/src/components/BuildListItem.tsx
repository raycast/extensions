import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import { timeAgo } from "../utils/format";
import { getStateIcon, State } from "../utils/states";

export interface Build {
  id: string;
  branch: string;
  createdAt: string;
  state: State;
  message: string;
  number: number;
  url: string;
  pipeline?: {
    name: string;
  };
}

interface BuildListItemProps {
  build: Build;
}

export function BuildListItem({ build }: BuildListItemProps) {
  return (
    <List.Item
      id={build.id}
      title={build.message}
      subtitle={build.pipeline?.name ?? `#${build.number}`}
      icon={getStateIcon(build.state)}
      keywords={[build.pipeline?.name || "", build.number.toString()]}
      accessoryTitle={timeAgo(build.createdAt)}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={build.url} />
          <CopyToClipboardAction content={build.url} title="Copy URL" />
        </ActionPanel>
      }
    />
  );
}
