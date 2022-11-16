import { ActionPanel, Detail, List, useNavigation, Action } from "@raycast/api";

export default function Command() {
  const { push } = useNavigation();

  return (
    <List>
      <List.Item
        title="Push Action"
        actions={
          <ActionPanel title="Actions">
            <Action.Push title="Show Details" target={<Details description="# Hello there" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Custom Hook"
        actions={
          <ActionPanel>
            <Action
              title="Open Detail with Hook"
              onAction={() => {
                push(<Details description="#Details" />);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function Details(props: { description: string }) {
  const { pop } = useNavigation();

  return (
    <Detail
      navigationTitle="Details"
      markdown={props.description}
      actions={
        <ActionPanel title="Detail">
          <Action title="Pop Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
