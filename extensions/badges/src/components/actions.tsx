import { Action, ActionPanel } from "@raycast/api";

export const Documentation = ({ title, url }: { title: string; url: string }) => (
  <ActionPanel.Section>
    <Action.OpenInBrowser title={title} url={url} />
  </ActionPanel.Section>
);
