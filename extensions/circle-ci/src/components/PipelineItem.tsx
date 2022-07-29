import { ActionPanel, Icon, List, SubmitFormAction, OpenInBrowserAction } from "@raycast/api";
import { Pipeline } from "../types";

export const PipelineItem = ({ pipeline, onReload }: { pipeline: Pipeline; onReload: () => void }) => (
  <List.Item
    icon={{ source: Icon.Checkmark }}
    accessoryIcon={pipeline.trigger.actor.avatar_url || "gearshape-16"}
    title={"No status"}
    subtitle={pipeline.vcs.tag || pipeline.vcs.branch || ""}
    accessoryTitle={new Date(pipeline.created_at).toLocaleTimeString()}
    keywords={[pipeline.vcs.branch || pipeline.vcs.tag || ""]}
    actions={
      <ActionPanel>
        <OpenInBrowserAction
          title={"Open Project Pipelines"}
          url={`https://app.circleci.com/pipelines/${pipeline.project_slug.replace(/\bgh\b/, "github")}`}
        />
        <SubmitFormAction
          title="Refresh"
          onSubmit={onReload}
          icon={Icon.ArrowClockwise}
          shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
        />
      </ActionPanel>
    }
  />
);
