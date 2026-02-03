import { Grid, ActionPanel, Action, Icon } from "@raycast/api";

export default function Command() {
  return (
    <Grid columns={5} inset={Grid.Inset.Large}>
      <Grid.Section title="Send to LocalSend Device">
        <Grid.Item
          content={{ source: Icon.Document, tintColor: "#FFFFFF" }}
          title="Files"
          actions={
            <ActionPanel>
              <Action.Push title="Send Files" icon={Icon.Document} target={<SendFilesCommand />} />
            </ActionPanel>
          }
        />

        <Grid.Item
          content={{ source: Icon.Image, tintColor: "#FFFFFF" }}
          title="Media"
          actions={
            <ActionPanel>
              <Action.Push title="Send Media" icon={Icon.Image} target={<SendMediaCommand />} />
            </ActionPanel>
          }
        />

        <Grid.Item
          content={{ source: Icon.Text, tintColor: "#FFFFFF" }}
          title="Text"
          actions={
            <ActionPanel>
              <Action.Push title="Send Text" icon={Icon.Text} target={<SendTextCommand />} />
            </ActionPanel>
          }
        />

        <Grid.Item
          content={{ source: Icon.Clipboard, tintColor: "#FFFFFF" }}
          title="Clipboard"
          actions={
            <ActionPanel>
              <Action.Push title="Send Clipboard" icon={Icon.Clipboard} target={<SendClipboardCommand />} />
            </ActionPanel>
          }
        />

        <Grid.Item
          content={{ source: Icon.Folder, tintColor: "#FFFFFF" }}
          title="Folder"
          actions={
            <ActionPanel>
              <Action.Push title="Send Folder" icon={Icon.Folder} target={<SendFolderCommand />} />
            </ActionPanel>
          }
        />
      </Grid.Section>
    </Grid>
  );
}

// Import the actual send command components
import SendFilesCommand from "./send-files";
import SendMediaCommand from "./send-media";
import SendTextCommand from "./send-text";
import SendClipboardCommand from "./send-clipboard";
import SendFolderCommand from "./send-folder";
