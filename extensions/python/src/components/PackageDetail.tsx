import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement } from "react";

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
  /*
      "urls": [
        {
            "comment_text": null,
            "digests": {
                "blake2b_256": "50b3b51f09c2ba432a576fe63758bddc81f78f0c6309d9e5c10d194313bf021e",
                "md5": "e1d8b9b56324788b42ffcf5833b5a3f4",
                "sha256": "e94613d6c05e27be7ffebdd6ea5f388112e5e430c8f7d6494a9d1d88d43e814d"
            },
            "downloads": -1,
            "filename": "fastapi-0.115.12-py3-none-any.whl",
            "has_sig": false,
            "md5_digest": "e1d8b9b56324788b42ffcf5833b5a3f4",
            "packagetype": "bdist_wheel",
            "python_version": "py3",
            "requires_python": ">=3.8",
            "size": 95164,
            "upload_time": "2025-03-23T22:55:42",
            "upload_time_iso_8601": "2025-03-23T22:55:42.101023Z",
            "url": "https://files.pythonhosted.org/packages/50/b3/b51f09c2ba432a576fe63758bddc81f78f0c6309d9e5c10d194313bf021e/fastapi-0.115.12-py3-none-any.whl",
            "yanked": false,
            "yanked_reason": null
        },
  */
  urls: {
    comment_text: string | null;
    digests: {
      blake2b_256: string;
      md5: string;
      sha256: string;
    };
    downloads: number;
    filename: string;
    has_sig: boolean;
    md5_digest: string;
    packagetype: string;
    python_version: string;
    requires_python: string;
    size: number;
    upload_time: string;
    upload_time_iso_8601: string;
    url: string;
    yanked: boolean;
    yanked_reason: string | null;
  }[];
};

export const PackageDetail = ({ name, version }: PackageDetailProps): ReactElement => {
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
          <Detail.Metadata.Label
            title="Released"
            text={{
              value: data?.urls?.[0]?.upload_time_iso_8601
                ? new Date(data.urls[0].upload_time_iso_8601).toLocaleDateString()
                : "Unknown",
              color: Color.PrimaryText,
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
              title="Copy Pip Install Command"
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
