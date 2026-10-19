import { Action, ActionPanel, Icon } from "@raycast/api";

function CommonActions() {
  return (
    <ActionPanel.Section title="Common Actions">
      <Action.OpenInBrowser
        title="Open GitHub Actions"
        url="https://github.com/vogelino/vogelino-portfolio/actions"
        icon={Icon.Cog}
        shortcut={{ modifiers: ["opt"], key: "a" }}
      />
      <Action.OpenInBrowser
        title="Open Vercel Deployments"
        url="https://vercel.com/vogelinos-projects/vogelino-svelte/deployments"
        icon={Icon.Cloud}
        shortcut={{ modifiers: ["opt"], key: "v" }}
      />
    </ActionPanel.Section>
  );
}

export default CommonActions;
