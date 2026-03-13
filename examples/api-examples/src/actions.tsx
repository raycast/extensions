import {
  ActionPanel,
  Detail,
  Icon,
  showHUD,
  showToast,
  Action,
  Toast,
  Alert,
  confirmAlert,
  Color,
  open,
} from "@raycast/api";
import { homedir } from "os";
import { resolve } from "path";

const description = `
# Actions

The [Action Panel](https://www.notion.so/raycastapp/Action-Panel-d142399d7e3b45018675d64612c63174)
lets you find and take any action with just a few keystrokes. Press \`⌘ + K\` to search for all
available actions in the panel.

## Built-in actions

Leverage one of the built-in actions to quickly add functionality to your commands:
- Use the \`Action.CopyToClipboard\` to copy text to the clipboard
- Use the \`Action.OpenInBrowser\` to open links in the browser
- Use the \`Action.ShowInFinder\` to show files or folders in the Finder
- Use the \`Action.Paste\` to paste text to the frontmost application
- Use the \`Action.OpenWith\` to open something with list of installed applications
## Custom actions

Use the \`Action\` to extend your commands even further. Specify a title, icon, style and action
handler. Or wrap it in a separate React component to reuse it.
Use Action.Style.Destructive

## Keyboard shortcuts

Assign keyboard shortcuts to actions to make it quicker for users to perform them. By default, the
first two actions get the primary (\`↵\`) and secondary shortcut (\`⌘ + ↵\`).
`;

const downloadsDir = resolve(homedir(), "Downloads");

export default function Command() {
  return (
    <Detail
      markdown={description}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Built-in actions">
            <Action.CopyToClipboard content="Text copied to the clipboard" />
            <Action.OpenInBrowser url="https://raycast.com" />
            <Action.ShowInFinder title="Open Downloads" path={downloadsDir} />
            <Action.Paste content="Text pasted to the frontmost application" />
            <Action.OpenWith path={downloadsDir} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Custom actions">
            <Action
              title="Custom Action"
              icon={Icon.Dot}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() =>
                showToast({
                  style: Toast.Style.Success,
                  title: "Performed custom action",
                })
              }
            />
            <Action
              title="Move to Trash"
              style={Action.Style.Destructive}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const options: Alert.Options = {
                  icon: { source: Icon.Trash, tintColor: Color.Red },
                  title: "Are you sure?",
                  message:
                    "We won't move anything to Trash, it's just a showcase for the Action with the Destructive style",
                  primaryAction: {
                    title: "Confirm",
                    style: Alert.ActionStyle.Destructive,
                    onAction: () => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Performed 'Move to Trash' action",
                      });
                    },
                  },
                };
                await confirmAlert(options);
              }}
            />
            <ReusableAction title="Hey 👋" />
            <ActionPanel.Submenu title="Open with…" icon={Icon.Globe}>
              <Action title="Google Chrome" onAction={() => open("https://raycast.com", "'google chrome'")} />
              <Action title="Safari" onAction={() => open("https://raycast.com", "Safari")} />
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ReusableAction(props: { title: string; icon?: Icon }) {
  return (
    <Action
      title="Reusable Action"
      icon={props.icon ?? Icon.Star}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      onAction={() => showHUD(props.title)}
    />
  );
}
