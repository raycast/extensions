import { Action, ActionPanel, Alert, confirmAlert, environment, Form, Icon, List, useNavigation } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { SelectFolder } from "./utils/selectFolder";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";

type Location = {
  id: string;
  path: string;
  name: string;
};

export default function Command() {
  const [locations, setLocations] = useCachedState<Location[]>("locations", []);
  const { push, pop } = useNavigation();

  function DeleteLocationAction({ id, onDelete }: { id: string; onDelete?: () => void }) {
    return (
      <Action
        style={Action.Style.Destructive}
        title="Remove Snippet Location"
        icon={Icon.Trash}
        shortcut={{ key: "delete", modifiers: ["cmd"] }}
        onAction={async () => {
          if (
            await confirmAlert({
              title: "Are you sure?",
              message: "This will NOT delete the folder or the snippets, just remove the path from your preferences.",
              primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
            })
          ) {
            setLocations(locations.filter((l) => l.id !== id));
            if (onDelete) onDelete();
          }
        }}
      />
    );
  }

  function EditLocationForm({ location }: { location: Partial<Location> }) {
    const { handleSubmit, itemProps } = useForm<Location>({
      onSubmit: (data) => {
        data.id = location.id ?? uuidv4();

        locations.findIndex((l) => l.id === data.id) === -1
          ? setLocations([...locations, data])
          : setLocations(locations.map((l) => (l.id === data.id ? data : l)));

        pop();
      },
      initialValues: location,
      validation: { path: FormValidation.Required, name: FormValidation.Required },
    });
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
            {location.id && <DeleteLocationAction id={location.id} onDelete={pop} />}
          </ActionPanel>
        }
      >
        <Form.TextField {...itemProps.name} title="Name" />
        <Form.TextField {...itemProps.path} title="Path" />
      </Form>
    );
  }

  function AddLocationAction() {
    return (
      <SelectFolder
        title="Add Location"
        prompt="Select a folder to add"
        shortcut={{ key: "n", modifiers: ["cmd"] }}
        icon={Icon.NewFolder}
        onSelect={(path) => {
          if (path) {
            push(<EditLocationForm location={{ path }} />);
          }
        }}
      />
    );
  }

  function RevealInFinderAction({ path }: { path: Location["path"] }) {
    return <Action.ShowInFinder title="Reveal in Finder" icon={Icon.Finder} path={path} />;
  }

  return (
    <List
      actions={
        <ActionPanel>
          <AddLocationAction />
        </ActionPanel>
      }
    >
      <List.Section>
        {locations.map((location) => (
          <List.Item
            title={location.name}
            icon={Icon.Folder}
            subtitle={location.path}
            actions={
              <ActionPanel>
                <RevealInFinderAction path={location.path} />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<EditLocationForm location={location} />}
                  shortcut={{ key: "e", modifiers: ["cmd"] }}
                />
                <DeleteLocationAction id={location.id} />
                <AddLocationAction />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="My Computer"
          subtitle="default, cannot be changed"
          icon={Icon.StarCircle}
          actions={
            <ActionPanel>
              <RevealInFinderAction path={join(environment.supportPath, "snippets")} />
              <AddLocationAction />
            </ActionPanel>
          }
        />

        <List.Item
          title="Add Location"
          icon={Icon.NewFolder}
          actions={
            <ActionPanel>
              <AddLocationAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
