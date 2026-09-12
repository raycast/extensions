import { Color, Icon, List } from "@raycast/api";
import { getDomainLabel, parseAuthor, ZedExtension } from "../lib/extension";

export interface ExtensionItemProps extends Pick<
  List.Item.Props,
  "icon" | "accessoryIcon" | "actions" | "keywords" | "accessories"
> {
  extension: ZedExtension;
  isInstalled: boolean;
  installedVersion?: string;
  areUpdatesIgnored?: boolean;
}

export function ExtensionItem({
  extension,
  isInstalled,
  installedVersion,
  areUpdatesIgnored = false,
  ...props
}: ExtensionItemProps) {
  const publishedDate = new Date(extension.published_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const mainMarkdown = [
    `# ${extension.name}`,
    `***`,
    extension.description.trim() || "_No description provided._",
  ].join("\n\n");

  const remoteVersion = extension.version;
  const hasUpdate = isInstalled && installedVersion && installedVersion !== remoteVersion;

  let statusText = "Not Installed";
  let statusIcon = { source: Icon.Circle, tintColor: Color.SecondaryText };
  const itemAccessories = [];

  if (hasUpdate) {
    statusText = "Update Available";
    statusIcon = { source: Icon.ArrowDownCircle, tintColor: Color.Orange };
    itemAccessories.push({
      icon: statusIcon,
      tooltip: `Update available: v${remoteVersion}`,
    });
  } else if (isInstalled) {
    statusText = "Installed";
    statusIcon = { source: Icon.CheckCircle, tintColor: Color.Green };
    itemAccessories.push({
      icon: statusIcon,
      tooltip: "Installed",
    });
  }

  if (areUpdatesIgnored) {
    statusText = "Installed (Updates Ignored)";
    statusIcon = { source: Icon.EyeDisabled, tintColor: Color.SecondaryText };

    itemAccessories.unshift({
      icon: { source: Icon.EyeDisabled, tintColor: Color.SecondaryText },
      tooltip: "Auto-updates ignored",
    });
  }

  return (
    <List.Item
      id={extension.id}
      accessories={itemAccessories}
      title={extension.name}
      {...props}
      detail={
        <List.Item.Detail
          markdown={mainMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Status" text={statusText} icon={statusIcon} />

              {hasUpdate ? (
                <>
                  <List.Item.Detail.Metadata.Label title="Installed Version" text={`v${installedVersion}`} />
                  <List.Item.Detail.Metadata.Label title="Latest Version" text={`v${remoteVersion}`} />
                </>
              ) : (
                <List.Item.Detail.Metadata.Label title="Latest Version" text={`v${remoteVersion}`} />
              )}

              <List.Item.Detail.Metadata.Separator />

              {extension.authors.map((authorString, index) => {
                const { name, email } = parseAuthor(authorString);
                const isFirst = index === 0;
                const labelTitle = isFirst ? "Authors" : "";
                if (email) {
                  return (
                    <List.Item.Detail.Metadata.Link
                      key={authorString}
                      title={labelTitle}
                      text={`${name} (${email})`}
                      target={`mailto:${email}`}
                    />
                  );
                }
                return <List.Item.Detail.Metadata.Label key={authorString} title={labelTitle} text={name} />;
              })}

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Downloads"
                text={extension.download_count.toLocaleString()}
                icon={Icon.Download}
              />
              <List.Item.Detail.Metadata.Label title="Published on" text={publishedDate} icon={Icon.Calendar} />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Link
                title="Repository"
                text={getDomainLabel(extension.repository)}
                target={extension.repository}
              />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.TagList title="Provides">
                {extension.provides.map((capability) => (
                  <List.Item.Detail.Metadata.TagList.Item key={capability} text={capability} color={Color.Magenta} />
                ))}
              </List.Item.Detail.Metadata.TagList>

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.TagList title="Schema Version">
                <List.Item.Detail.Metadata.TagList.Item text={`v${extension.schema_version}`} color={Color.Blue} />
              </List.Item.Detail.Metadata.TagList>

              {!!extension.wasm_api_version && (
                <List.Item.Detail.Metadata.TagList title="WASM API Version">
                  <List.Item.Detail.Metadata.TagList.Item text={`v${extension.wasm_api_version}`} color={Color.Green} />
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
