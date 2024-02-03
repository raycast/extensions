import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { Project } from "../api";
import CreateTimeEntryForm from "./CreateTimeEntryForm";
import { ExtensionContextProvider } from "../context/ExtensionContext";
import { TimeEntryContextProvider } from "../context/TimeEntryContext";

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
      icon={{ source: Icon.Circle, tintColor: project?.color }}
      title={project?.name || "No project"}
      subtitle={subtitle}
      accessoryTitle={accessoryTitle}
      keywords={subtitle?.split(" ") || []}
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Time Entry"
            icon={Icon.Clock}
            target={
              <ExtensionContextProvider>
                <TimeEntryContextProvider>
                  <CreateTimeEntryForm project={project} />
                </TimeEntryContextProvider>
              </ExtensionContextProvider>
            }
          />
        </ActionPanel>
      }
    />
  );
}
