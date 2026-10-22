import { Action, ActionPanel, Icon, List } from "@raycast/api";

const CONTRIBUTING_URL = "https://github.com/solomkinmv/hotkys/blob/main/CONTRIBUTING.md";
const MY_SHORTCUTS_URL = "https://hotkys.com/my-shortcuts";

interface UnsupportedAppProps {
  title: string;
  description: string;
  identifier?: string;
}

export function UnsupportedApp({ title, description, identifier }: UnsupportedAppProps) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.QuestionMarkCircle}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Contribution Guide" url={CONTRIBUTING_URL} />
            <Action.OpenInBrowser title="Create Private Shortcuts" url={MY_SHORTCUTS_URL} />
            {identifier ? <Action.CopyToClipboard title="Copy App Identifier" content={identifier} /> : null}
          </ActionPanel>
        }
      />
    </List>
  );
}
