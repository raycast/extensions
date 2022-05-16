import { List, Icon, ActionPanel, PushAction } from "@raycast/api";
import { AppContextProvider } from "../context";
import { Project } from "../toggl/types";
import CreateTimeEntryForm from "./CreateTimeEntryForm";

export default function ProjectListItem({
  project,
  subtitle,
  accessoryTitle,
}: {
  project?: Project;
  subtitle?: string;
  accessoryTitle?: string;
}) {
  return (
    <List.Item
      icon={{ source: Icon.Circle, tintColor: project?.hex_color }}
      title={project?.name || "No project"}
      subtitle={subtitle}
      accessoryTitle={accessoryTitle}
      keywords={subtitle?.split(" ") || []}
      actions={
        <ActionPanel>
          <PushAction
            title="Create Time Entry"
            icon={Icon.Clock}
            target={
              <AppContextProvider>
                <CreateTimeEntryForm project={project} />
              </AppContextProvider>
            }
          />
        </ActionPanel>
      }
    />
  );
}
