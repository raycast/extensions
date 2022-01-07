import { ActionPanel, Icon, List, OpenInBrowserAction, PushAction, SubmitFormAction } from "@raycast/api";
import { ListCircleCIProjectPipelines } from "./ListCircleCIProjectPipelines";
import { uriToLongerSlug } from "../utils";


export const ProjectListItem = ({ uri, name, onReload }: { uri: string, name: string, onReload: () => void }) =>
  <List.Item
    title={name}
    icon={{ source: { light: "icon.png", dark: "icon@dark.jpg" } }}
    actions={
      <ActionPanel>
        <OpenInBrowserAction url={`https://app.circleci.com/pipelines/github/${name}`} />
        <SubmitFormAction
          title="Refresh Project List"
          icon={Icon.ArrowClockwise}
          onSubmit={onReload}
          shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
        />
        <PushAction
          title={"List Pipelines"}
          icon={Icon.Binoculars}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          target={<ListCircleCIProjectPipelines full_name={name} uri={uri} />}
        />
        <OpenInBrowserAction
          title="Project Settings"
          icon={Icon.Gear}
          url={"https://app.circleci.com/settings/project/" + uriToLongerSlug(uri)}
          shortcut={{ key: "s", modifiers: ["cmd", "shift"] }}
        />
      </ActionPanel>
    }
  />;
