import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { gt } from "semver";

interface TypstPackageResponse {
  name: string;
  version: string;
  entrypoint: string;
  authors: string[];
  license: string;
  description: string;
  repository: string;
  keywords: string;
  compiler: string;
  exclude: string[];
  size: number;
  readme: string;
  updateAt: number;
  releasedAt: number;
}

const TYPST_PACKAGE_BASE: string = "https://packages.typst.org/preview";

export default function SearchTypstPackage() {
  const { data, isLoading } = useFetch<TypstPackageResponse[]>(
    `${TYPST_PACKAGE_BASE}/index.json`,
    {
      keepPreviousData: true,
    },
  );

  const packages = useMemo(() => {
    const map = new Map<string, TypstPackageResponse>();

    data!.forEach((pkg) => {
      const prev = map.get(pkg.name);
      if (!prev || gt(pkg.version, prev.version)) {
        map.set(pkg.name, {
          ...pkg,
          authors: [pkg.authors[0].replace(/<[^>]*>/g, "").trim()],
        });
      }
    });

    return [...map.values()];
  }, [data]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Typst packages…">
      {packages.map((pkg) => (
        <List.Item
          key={`${pkg.name}@${pkg.version}`}
          title={pkg.name}
          subtitle={pkg.description}
          accessories={[
            { text: pkg.authors[0], icon: Icon.Person },
            { text: pkg.version, icon: Icon.Tag },
          ]}
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={<TypstPackageDetail {...pkg} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TypstPackageDetail(pkg: TypstPackageResponse) {
  const { data, isLoading } = useFetch<string>(
    `${TYPST_PACKAGE_BASE}/readmes/${pkg.name}-${pkg.version}.md`,
    { keepPreviousData: true },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      navigationTitle={pkg.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="author" text={pkg.authors[0]} />
          <Detail.Metadata.Label title="version" text={pkg.version} />
          <Detail.Metadata.Link
            title="Repository"
            text="Open Repo"
            target={pkg.repository}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Import"
            content={`#import "@preview/${pkg.name}:${pkg.version}": *`}
          />
        </ActionPanel>
      }
    />
  );
}
