import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { MiseRegistryEntry, formatMiseError, installTool } from "../tools/mise";

export function SearchResultItem({ entry, isInstalled }: { entry: MiseRegistryEntry; isInstalled: boolean }) {
  const description = entry.description;
  const installCommand = `mise install ${entry.name}`;
  const backends = entry.backends || [];

  const accessories: List.Item.Accessory[] = [];
  if (isInstalled) {
    accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Installed" });
  }
  if (description) {
    accessories.push({ tag: description });
  }
  if (entry.identifier && entry.identifier !== description) {
    accessories.push({ tag: entry.identifier });
  }

  return (
    <List.Item
      title={entry.name}
      subtitle={description}
      icon={isInstalled ? { source: Icon.Check, tintColor: Color.Green } : Icon.MagnifyingGlass}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Install">
            <Action
              title="Install Latest Version"
              icon={Icon.Download}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${entry.name}` });
                try {
                  await installTool(entry.name);
                  toast.style = Toast.Style.Success;
                  toast.title = `Installed ${entry.name}`;
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = `Failed to install ${entry.name}`;
                  toast.message = formatMiseError(error);
                }
              }}
            />
            <Action.Push
              title="Choose Version to Install"
              icon={Icon.List}
              target={<SelectVersionView toolName={entry.name} />}
            />
            {backends.length > 1 && (
              <Action.Push
                title="Install with Backend…"
                icon={Icon.AppWindow}
                target={<SelectBackendView toolName={entry.name} backends={backends} />}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Information">
            {entry.url ? <Action.OpenInBrowser title="Visit Homepage" url={entry.url} icon={Icon.Globe} /> : null}
            <Action.OpenInBrowser
              title="Search on Google"
              url={`https://www.google.com/search?q=mise+tool+${entry.name}`}
              icon={Icon.MagnifyingGlass}
            />
            <Action.CopyToClipboard title="Copy Install Command" content={installCommand} />
            {entry.identifier ? (
              <Action.CopyToClipboard title="Copy Backend Identifier" content={entry.identifier} />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SelectVersionView({ toolName }: { toolName: string }) {
  const { data, isLoading, error } = usePromise(
    (name: string) => import("../tools/mise").then((mod) => mod.listAllVersions(name)),
    [toolName],
  );
  const versions = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search versions for ${toolName}`}>
      {error ? (
        <List.EmptyView
          title="Failed to load versions"
          description={formatMiseError(error)}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {versions.map((version) => (
        <List.Item
          key={version}
          title={version}
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <Action
                title={`Install ${toolName}@${version}`}
                icon={Icon.Download}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Installing ${toolName}@${version}`,
                  });
                  try {
                    const { installTool } = await import("../tools/mise");
                    await installTool(toolName, { version });
                    toast.style = Toast.Style.Success;
                    toast.title = `Installed ${toolName}@${version}`;
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = `Failed to install ${toolName}@${version}`;
                    toast.message = formatMiseError(error);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SelectBackendView({ toolName, backends }: { toolName: string; backends: string[] }) {
  return (
    <List searchBarPlaceholder={`Select backend for ${toolName}`}>
      {backends.map((backend) => (
        <List.Item
          key={backend}
          title={backend}
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action
                title={`Install Using ${backend}`}
                icon={Icon.Download}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Installing ${toolName} via ${backend}`,
                  });
                  try {
                    const { installTool } = await import("../tools/mise");
                    await installTool(backend);

                    toast.style = Toast.Style.Success;
                    toast.title = `Installed ${backend}`;
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = `Failed to install ${backend}`;
                    toast.message = formatMiseError(error);
                  }
                }}
              />
              <Action.Push title="Choose Version…" icon={Icon.List} target={<SelectVersionView toolName={backend} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
