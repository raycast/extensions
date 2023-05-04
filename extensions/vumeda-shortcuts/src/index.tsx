import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        icon={Icon.Switch}
        title="Contact Energy"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=f1d1990b-77f5-5578-bcf6-a773959d4310" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="Nova Energy"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=71401591-0d84-5c48-81ec-f6b9ed0f9826" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="Zeronet"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=0606bd21-e84e-5fda-b099-88109fd32f53" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="Digital Emporium"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=5c770ec2-5f19-5bb0-aeed-0fc602a4396b" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="WorldNet"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=6f89c1aa-76b4-58c2-bb00-bf876970dded" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="YelloHalo"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=03790f98-9a07-48c5-8b6e-6150bf3131cf" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="GoodNet"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=3b5dc9fa-36ae-52a1-b9d9-ea126043d4ce" />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Switch}
        title="Test VISP"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=a95dffbd-8f54-5384-8ae6-1bc506b4cef5" />
          </ActionPanel>
        }
      />
      <List.Item
        icon="devoli-32.png"
        title="Back to Devoli"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://vumeda.devoli.com/main/switchcompany?id=5e867201-d9c9-5a4d-b5dd-fbd07364ad60" />
          </ActionPanel>
        }
      />

    </List>
  );
}
