import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { appName, instances, links } from "./parallex";

export default function OpenInstance() {
  const all = instances();
  return (
    <List searchBarPlaceholder="Find an instance">
      <List.EmptyView
        icon={Icon.AppWindowGrid2x2}
        title="No instances yet"
        description="Make one with New Instance, or in Parallex."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Get Parallex" url="https://parallex.mandip.dev" />
          </ActionPanel>
        }
      />
      {all.map((instance) => (
        <List.Item
          key={instance.slug}
          icon={{ fileIcon: instance.wrapperPath }}
          title={instance.name}
          subtitle={instance.targetApp ? appName(instance.targetApp) : undefined}
          keywords={[appName(instance.targetApp), instance.slug]}
          accessories={instance.badge ? [{ tag: { value: instance.badge, color: instance.color } }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.ArrowNe}
                onAction={async () => {
                  await open(links.open(instance.name));
                  await showHUD(`Opening ${instance.name}`);
                }}
              />
              <Action title="Show in Parallex" icon={Icon.Eye} onAction={() => open(links.show(instance.name))} />
              <Action.CopyToClipboard title="Copy Link" content={links.open(instance.name)} />
              <Action.ShowInFinder path={instance.wrapperPath} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
