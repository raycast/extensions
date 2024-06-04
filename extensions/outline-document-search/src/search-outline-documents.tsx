import { Action, ActionPanel, launchCommand, LaunchType, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import DocumentSearch from "./DocumentSearch";
import { Instance } from "./queryInstances";
import EmptyList from "./EmptyList";

const Command = () => {
  const { value: instances } = useLocalStorage<Instance[]>("instances");

  if (!instances || (instances && instances.length === 0)) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Manage Instances"
              onAction={() => launchCommand({ name: "manage-outline-instances", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      >
        <EmptyList />
      </List>
    );
  } else {
    if (instances.length === 1) {
      return <DocumentSearch instances={instances} />;
    } else {
      return (
        <List
          actions={
            <ActionPanel>
              <Action
                title="Manage Instances"
                onAction={() => launchCommand({ name: "manage-outline-instances", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
          searchBarPlaceholder="Select an instance to search in or search everywhere"
        >
          <List.Section subtitle={instances.length.toString()} title="Instances">
            {instances.map((instance, index) => (
              <List.Item
                actions={
                  <ActionPanel>
                    <Action.Push title="Search Documents" target={<DocumentSearch instances={[instance]} />} />
                  </ActionPanel>
                }
                key={index}
                title={`Search in ${instance.name}`}
              />
            ))}
          </List.Section>
          <List.Section title="All Instances">
            <List.Item
              actions={
                <ActionPanel>
                  <Action.Push title="Search Documents" target={<DocumentSearch instances={instances} />} />
                </ActionPanel>
              }
              title="Search everywhere"
            />
          </List.Section>
        </List>
      );
    }
  }
};

export default Command;
