import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";

export default function Command() {
  const content = `{
  "registries": {
    "@svgl": "https://svgl.app/r/{name}.json"
  }
}`;

  return (
    <List searchBarPlaceholder="Setup shadcn/ui Registry">
      <List.EmptyView
        title="Setup shadcn/ui Registry"
        description="Copy svgl registry JSON into your clipboard."
        icon={{
          source: {
            light: "https://svgl.app/library/shadcn-ui.svg",
            dark: "https://svgl.app/library/shadcn-ui_dark.svg",
          },
        }}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Clipboard}
              title="Copy Registry JSON"
              onAction={async () => {
                await Clipboard.copy(content);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied to clipboard",
                  message: "Add the svgl registry to your components.json file",
                });
              }}
            />
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title="Open Svgl Shadcn/ui Registry Docs"
              url="https://svgl.app/docs/shadcn-ui"
            />
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title="Open Shadcn/ui Registry Docs"
              url="https://ui.shadcn.com/docs/registry"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
