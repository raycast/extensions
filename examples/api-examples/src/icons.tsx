import { ActionPanel, Color, Icon, List, Action, Image } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Section title="Built-in Icons">
        <List.Item title="Icon" icon={Icon.Bubble} />
        <List.Item title="Icon with standard color" icon={{ source: Icon.Bubble, tintColor: Color.Blue }} />
        <List.Item title="Icon with custom color" icon={{ source: Icon.Bubble, tintColor: "#F15C8D" }} />
      </List.Section>

      <List.Section title="Bundled Assets">
        <List.Item title="Avatar" icon="avatar.png" />
        <List.Item title="Circle avatar" icon={{ source: "avatar.png", mask: Image.Mask.Circle }} />
        <List.Item title="Rounded avatar" icon={{ source: "avatar.png", mask: Image.Mask.RoundedRectangle }} />
        <List.Item title="Theme avatar" icon={{ source: { light: "avatar-light.png", dark: "avatar-dark.png" } }} />
      </List.Section>

      <List.Section title="File Icons">
        <List.Item title="Folder" icon={{ fileIcon: __dirname }} />
        <List.Item
          title="File"
          icon={{ fileIcon: __filename }}
          actions={
            <ActionPanel>
              <Action.OpenWith path={__filename} />
            </ActionPanel>
          }
        />
        <List.Item title="App" icon={{ fileIcon: "/System/Applications/Utilities/Terminal.app" }} />
      </List.Section>
    </List>
  );
}
