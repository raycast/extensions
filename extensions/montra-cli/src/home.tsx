import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search actions...">
      <List.Section title="Authentication">
        <List.Item title="Login" icon={Icon.Key} actions={<Actions command="auth-login" />} />
        <List.Item title="Status" icon={Icon.Person} actions={<Actions command="auth-status" />} />
        <List.Item title="Logout" icon={Icon.XMarkCircle} actions={<Actions command="auth-logout" />} />
      </List.Section>
      <List.Section title="Users">
        <List.Item title="Impersonate User" icon={Icon.Person} actions={<Actions command="impersonate" />} />
      </List.Section>
      <List.Section title="API Keys">
        <List.Item title="Create API Key" icon={Icon.Plus} actions={<Actions command="api-key-create" />} />
        <List.Item title="List API Keys" icon={Icon.List} actions={<Actions command="api-key-list" />} />
      </List.Section>
      <List.Section title="Data & Tools">
        <List.Item title="Copy Media Sync" icon={Icon.ArrowRight} actions={<Actions command="data-cp" />} />
        <List.Item title="Run Load Test" icon={Icon.BulletPoints} actions={<Actions command="load-test" />} />
        <List.Item title="Resign MP4 URLs" icon={Icon.Video} actions={<Actions command="resign-mp4-urls" />} />
        <List.Item title="Generate JWT" icon={Icon.Paragraph} actions={<Actions command="jwt-generate" />} />
      </List.Section>
    </List>
  );
}

function Actions({ command }: { command: string }) {
  const link = createDeeplink({ command });
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={link} title="Open" />
    </ActionPanel>
  );
}
