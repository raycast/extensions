import { Action, ActionPanel, Form, Icon, LaunchProps, List, popToRoot, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Space } from "./types";

export default function ConfigureSpaces(props: LaunchProps) {
  const { value: spaces, setValue: setSpaces, isLoading } = useLocalStorage<Space[]>("spaces", []);

  if (props.launchContext?.spaceIndex) {
    if (isLoading) {
      return <Form isLoading={true} />;
    }
    const space = spaces?.find((s) => s.index === props.launchContext?.spaceIndex);
    return <SpaceForm space={space} spaces={spaces || []} setSpaces={setSpaces} isRoot={true} />;
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No spaces configured"
        description="Add a space to get started."
        actions={
          <ActionPanel>
            <Action.Push title="Add Space" target={<SpaceForm spaces={spaces || []} setSpaces={setSpaces} />} />
          </ActionPanel>
        }
      />
      {(spaces || []).map((space) => (
        <List.Item
          key={space.index}
          icon={space.icon || Icon.Monitor}
          title={space.name}
          subtitle={`Desktop ${space.index}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Space"
                icon={Icon.Pencil}
                target={<SpaceForm space={space} spaces={spaces || []} setSpaces={setSpaces} />}
              />
              <Action.Push
                title="Add Space"
                icon={Icon.Plus}
                target={<SpaceForm spaces={spaces || []} setSpaces={setSpaces} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Delete Space"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => {
                  const newSpaces = (spaces || []).filter((s) => s.index !== space.index);
                  setSpaces(newSpaces);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SpaceForm({
  space,
  spaces,
  setSpaces,
  isRoot = false,
}: {
  space?: Space;
  spaces: Space[];
  setSpaces: (spaces: Space[]) => void;
  isRoot?: boolean;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { index: string; name: string; icon: string }) {
    const index = parseInt(values.index, 10);
    const newSpace: Space = { index, name: values.name, icon: values.icon };

    const existingIndex = spaces.findIndex((s) => s.index === index);
    const newSpaces = [...spaces];

    if (existingIndex >= 0) {
      newSpaces[existingIndex] = newSpace;
    } else {
      newSpaces.push(newSpace);
    }

    // Sort by index
    newSpaces.sort((a, b) => a.index - b.index);

    await setSpaces(newSpaces);

    if (isRoot) {
      await popToRoot();
    } else {
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="index" title="Desktop Index" defaultValue={space?.index.toString() || "1"}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
          <Form.Dropdown.Item key={num} value={num.toString()} title={`Desktop ${num}`} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Name" placeholder="e.g. Work" defaultValue={space?.name || ""} />
      <Form.Dropdown id="icon" title="Icon" defaultValue={space?.icon || Icon.Monitor}>
        {Object.entries(Icon).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={value} title={key} icon={value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
