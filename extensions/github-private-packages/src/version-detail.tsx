import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PackageResponse } from "./search-packages";

export default function VersionDetail({ version, pack }: { version: VersionResponse; pack: PackageResponse }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={version.html_url} />
        </ActionPanel>
      }
      markdown={`# [${pack.name}](${pack.html_url})@[${version.name}](${version.html_url}) \n\n## Details: \n- **package type**: ${pack.package_type} \n- **updated**: ${new Date(version.updated_at).toLocaleString()} \n- **created**: ${new Date(pack.created_at).toLocaleString()} \n- **repository**: ${pack.repository.html_url} \n- **package url**: ${pack.html_url} \n- **version url**: ${version.url}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={pack.name} />
          <Detail.Metadata.TagList title="Version">
            <Detail.Metadata.TagList.Item icon={Icon.Tag} text={version.name} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Package type" text={pack.package_type} />
          <Detail.Metadata.Label title="Updated" text={new Date(version.updated_at).toLocaleString()} />
          <Detail.Metadata.Label title="Created" text={new Date(pack.created_at).toLocaleString()} />
          <Detail.Metadata.Link title="Repository" text={pack.repository.html_url} target={pack.repository.html_url} />
          <Detail.Metadata.Link title="Package URL" text={pack.html_url} target={pack.html_url} />
          <Detail.Metadata.Link title="Version URL" text={version.html_url} target={version.html_url} />
        </Detail.Metadata>
      }
    />
  );
}

type VersionResponse = {
  id: number;
  name: string;
  url: string;
  package_html_url: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  metadata: {
    package_type: string;
    container: {
      tags: string[];
    };
  };
};
