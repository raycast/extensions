import { ActionPanel, Action, Icon, Detail } from "@raycast/api";
import { getFormattedActiveInstallations, getFormattedLastUpdated, parseAuthorNameFromUrl } from "../utils";
import { Versions } from "./Versions";
import { Plugin } from "../index";

interface IPluginDetails {
  data: Plugin;
}

const wpPluginRepoRoot = "https://wordpress.org/plugins";

const pluginBody = ({ name, banners, short_description, author }: Plugin) => `
## ${name}
#### By ${parseAuthorNameFromUrl(author)}

![](${banners.low})

${short_description}
`;

export function PluginDetails({ data }: IPluginDetails) {
  return (
    <Detail
      markdown={pluginBody(data)}
      navigationTitle={data.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Version" text={data.version} />
          <Detail.Metadata.Label title="Tested up to" text={data.tested} />
          <Detail.Metadata.Label title="Last Updated" text={`${getFormattedLastUpdated(data.last_updated)} ago`} />
          <Detail.Metadata.Label
            title="Active Installations"
            text={`${getFormattedActiveInstallations(data.active_installs)}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${wpPluginRepoRoot}/${data.slug}`} title="Visit Plugin Page" />
          <Action.Push
            title="Show All Versions"
            target={<Versions versions={data.versions} slug={data.slug} />}
            icon={Icon.Tag}
          />
          <Action.CopyToClipboard
            content={`wpackagist-plugin/${data.slug}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy Composer Package Name"
          />
          <Action.OpenInBrowser
            url={`${data.download_link}`}
            title={`Download Latest Version - ${data.version}`}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}
