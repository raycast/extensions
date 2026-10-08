import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGradlePluginDetail } from "./actions/api";
import { GradlePluginDetail, PluginImplementation } from "./models/gradle-plugin";
import { VersionDropdown } from "./components/VersionDropdown";

export default function PluginDetais(props: { url: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [url, setURL] = useState<string>(props.url);
  const [plugin, setPlugin] = useState<GradlePluginDetail | null>(null);

  useEffect(() => {
    fetchGradlePluginDetails();
  }, [url]);

  const fetchGradlePluginDetails = async (): Promise<void> => {
    setIsLoading(true);
    setPlugin(null);

    const pluginDetails = await getGradlePluginDetail(url);

    setPlugin(pluginDetails);
    setIsLoading(false);
  };

  const getMarkdownForImplementation = (implementation: PluginImplementation): string | null => {
    return (
      plugin &&
      `
# ${plugin.name}
${plugin.selectedVersion.description}

Using the plugins DSL:
\`\`\`
${implementation.pluginDSL}
\`\`\`

Using legacy plugin application:
\`\`\`
${implementation.legacyPlugin}
\`\`\`
  `
    );
  };

  const onVersionChange = (newValue: string) => {
    setURL(newValue);
  };

  return (
    <List
      isShowingDetail={!isLoading && plugin !== null}
      isLoading={isLoading}
      navigationTitle={plugin?.name}
      searchBarAccessory={
        plugin && (
          <VersionDropdown
            selectedVersion={plugin.selectedVersion}
            versions={plugin.versions}
            onVersionChange={onVersionChange}
          />
        )
      }
    >
      {plugin &&
        plugin.implementations.map((implementation) => (
          <List.Item
            key={implementation.type}
            title={implementation.type}
            detail={
              <List.Item.Detail
                markdown={getMarkdownForImplementation(implementation)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Owner"
                      icon={plugin.owner.avatar}
                      text={plugin.owner.name}
                    />
                    <List.Item.Detail.Metadata.Label title="Version" text={plugin.selectedVersion.name} />
                    <List.Item.Detail.Metadata.Label title="Release Date" text={plugin.selectedVersion.releaseDate} />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open" url={url} />
                {plugin.sourceLink && <Action.OpenInBrowser title="Open Repository" url={plugin.sourceLink} />}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
