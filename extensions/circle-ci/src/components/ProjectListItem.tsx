import { ActionPanel, Icon, List, OpenInBrowserAction, PushAction, SubmitFormAction } from "@raycast/api";
import { ListProjectPipelines } from "./ListProjectPipelines";
import { uriToLongerSlug } from "../utils";

export const ProjectListItem = ({ uri, name, onReload }: { uri: string; name: string; onReload: () => void }) => (
  <List.Item
    title={name}
    icon={"hammer-16"}
    actions={
      <ActionPanel>
        <PushAction
          title={"List Pipelines"}
          icon={Icon.Binoculars}
          target={<ListProjectPipelines full_name={name} uri={uri} />}
        />
        <OpenInBrowserAction url={`https://app.circleci.com/pipelines/github/${name}`} />
        <SubmitFormAction
          title="Refresh Project List"
          icon={Icon.ArrowClockwise}
          onSubmit={onReload}
          shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
        />
        <OpenInBrowserAction
          title="Project Settings"
          icon={Icon.Gear}
          url={"https://app.circleci.com/settings/project/" + uriToLongerSlug(uri)}
          shortcut={{ key: "s", modifiers: ["cmd", "shift"] }}
        />
      </ActionPanel>
    }
  />
);
