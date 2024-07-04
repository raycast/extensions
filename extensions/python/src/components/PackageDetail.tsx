import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import fetch from "node-fetch";

interface PackageDetailProps {
  name: string;
  version: string;
}

type PackageInfo = {
  info: {
    name: string;
    summary: string;
    description: string;
    keywords: string;
    project_urls: Map<string, string>;
  };
};

export const PackageDetail = ({ name, version }: PackageDetailProps): JSX.Element => {
  const { data, isLoading } = usePromise(
    async () => {
      const response = await fetch(`https://pypi.org/pypi/${name}/${version}/json`);
      const data = (await response.json()) as unknown as PackageInfo;
      return data;
    },
    [],
    { execute: true },
  );

  const keywords: string[] = data?.info?.keywords?.split(",") ?? [];

  return (
    <Detail
      markdown={data?.info.description}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Name"
            text={{
              value: name,
              color: Color.Blue,
            }}
          />
          <Detail.Metadata.Label
            title="Latest Version"
            text={{
              value: version,
              color: Color.Green,
            }}
          />
          {keywords.length > 0 && (
            <Detail.Metadata.TagList title="Keywords">
              {keywords.map((keyword) => (
                <Detail.Metadata.TagList.Item key={keyword} text={keyword} />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />
          {data?.info?.summary && <Detail.Metadata.Label title="Summary" text={{ value: data?.info?.summary }} />}
          <Detail.Metadata.Separator />

          {data?.info.project_urls &&
            Object.entries(data?.info.project_urls).map(([key, value]) => {
              return <Detail.Metadata.Link key={key} title={key} target={value} text={key} />;
            })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy PIP Install Command"
              content={`pip install ${name}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard title="Copy Package Name" content={name} />
            <Action.CopyToClipboard title="Copy Package Name with Version" content={`${name}==${version}`} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Details">
            <Action.OpenInBrowser url={`https://pypi.org/project/${name}/`} title="Open Homepage" icon={Icon.Globe} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
