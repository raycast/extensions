import {Action, ActionPanel, Grid, Icon} from "@raycast/api";
import {IconResponse} from "../hooks/onSearchIcons";
import copyFileToClipboard from "../functions/copyFileToClipboard";

export default ({icon: {id, images, description, tags}}: { icon: IconResponse }) => <Grid.Item
  key={id}
  content={images["512"]}
  subtitle={description}
  keywords={tags && tags.length > 0 ? tags.split(",") : undefined}
  actions={<ActionPanel>
    <Action
      title="Copy to Clipboard"
      icon={Icon.Clipboard}
      shortcut={{modifiers: ["cmd"], key: "c"}}
      onAction={() => copyFileToClipboard({url: images["512"]})}
    />
    <Action.OpenInBrowser url={images["512"]} title="Open in Browser"/>
    <Action.OpenInBrowser
      url={`https://www.flaticon.com/free-icon/whatever_${id}`}
      title="Open Icon Page"
    />
  </ActionPanel>}
/>