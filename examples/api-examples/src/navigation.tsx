import { ActionPanel, Detail, List, PushAction, useNavigation } from "@raycast/api";

export default function Command() {
  const { push } = useNavigation();

  return (
    <List>
      <List.Item
        title="Push Action"
        actions={
          <ActionPanel title="Actions">
            <PushAction title="Show Details" target={<Details description="# Hello there" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Custom Hook"
        actions={
          <ActionPanel>
            <ActionPanel.Item
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
          <ActionPanel.Item title="Pop Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
