import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Extension, useExtensions } from "../lib/extensions";
import { compactNumberFormat } from "../lib/utils";

function InstallAction(props: { extension: Extension }): JSX.Element {
  const e = props.extension;
  const url = `raycast://extensions/${e.author.handle}/${e.name}?source=webstore`;
  return <Action.Open title="Install Extension" target={url} icon={{ source: Icon.Download }} />;
}

function sort(extensions: Extension[] | undefined): Extension[] | undefined {
  if (!extensions) {
    return undefined;
  }
  const exts = extensions.sort((a, b) => b.download_count - a.download_count);
  return exts;
}

export function ExtensionChartsPerDownload(): JSX.Element {
  const { extensions, isLoading } = useExtensions();
  const exts = sort(extensions);
  const totalInstalls = extensions ? extensions.reduce((total, c) => total + c.download_count, 0) : 0;
  return (
    <List isLoading={isLoading}>
      <List.Section title={`Extensions ${extensions?.length} (${compactNumberFormat(totalInstalls)} Installs)`}>
        {exts?.map((e) => (
          <List.Item
            key={e.id}
            icon={{ source: { light: e.icons.light || "", dark: e.icons.dark || "" } }}
            title={e.name}
            accessories={[{ text: `${compactNumberFormat(e.download_count)}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={e.store_url} />
                <InstallAction extension={e} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
