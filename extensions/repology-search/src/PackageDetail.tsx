import { ActionPanel, Action, Detail } from "@raycast/api";
import { Package } from "./types";

export function PackageDetail({ pkg }: { pkg: Package }) {
  const repo = pkg.repo;
  const subrepo = pkg.subrepo;
  const srcname = pkg.srcname;
  const binname = pkg.binname;
  const visiblename = pkg.visiblename;
  const version = pkg.version;
  const origversion = pkg.origversion;
  const status = pkg.status;
  const summary = pkg.summary;
  const licenses = pkg.licenses && pkg.licenses.length > 0 ? pkg.licenses : null;
  const categories = pkg.categories && pkg.categories.length > 0 ? pkg.categories : null;
  const maintainers = pkg.maintainers && pkg.maintainers.length > 0 ? pkg.maintainers : null;

  // Split licenses if they contain ' AND '
  const splitLicenses = licenses
    ? licenses.flatMap((license) => (license.includes(" AND ") ? license.split(" AND ") : license))
    : null;

  const markdown = `
  # ${srcname}

  ${summary ? summary : "No summary available."}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={srcname}
      metadata={
        <Detail.Metadata>
          {repo && <Detail.Metadata.Label title="Repository" text={repo} />}
          {subrepo && <Detail.Metadata.Label title="Subrepo" text={subrepo} />}
          {version && <Detail.Metadata.Label title="Version" text={version} />}
          {origversion && <Detail.Metadata.Label title="Original Version" text={origversion} />}
          {status && <Detail.Metadata.Label title="Status" text={status} />}
          {splitLicenses && (
            <Detail.Metadata.TagList title="Licenses">
              {splitLicenses.map((license, index) => (
                <Detail.Metadata.TagList.Item key={`${license}-${index}`} text={license} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {categories && (
            <Detail.Metadata.TagList title="Categories">
              {categories.map((category) => (
                <Detail.Metadata.TagList.Item key={category} text={category} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {maintainers && (
            <Detail.Metadata.TagList title="Maintainers">
              {maintainers.map((maintainer) => (
                <Detail.Metadata.TagList.Item key={maintainer} text={maintainer} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={visiblename || binname || srcname} />
          <Action.OpenInBrowser
            url={`https://repology.org/projects/?search=${
              visiblename || binname || srcname
            }&maintainer=&category=&inrepo=${repo}&notinrepo=&repos=&families=&repos_newest=&families_newest=`}
          />
        </ActionPanel>
      }
    />
  );
}
