import { List } from "@raycast/api";
import {
  buildInstallCommand,
  buildUpdateCommand,
  getPackageUrl,
} from "../lib/npm";
import { formatDate, formatKeywords, formatScore } from "../lib/format";
import { InstalledPackage, RegistryPackage } from "../lib/types";

function buildMarkdown(
  title: string,
  description?: string,
  command?: string,
): string {
  const lines = [
    `# ${title}`,
    "",
    description?.trim() || "_No description provided._",
  ];

  if (command) {
    lines.push("", "```sh", command, "```");
  }

  return lines.join("\n");
}

export function InstalledPackageDetail({ pkg }: { pkg: InstalledPackage }) {
  return (
    <List.Item.Detail
      markdown={buildMarkdown(
        pkg.name,
        pkg.description,
        buildUpdateCommand(pkg.name),
      )}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Installed Version"
            text={pkg.version}
          />
          {pkg.latestVersion ? (
            <List.Item.Detail.Metadata.Label
              title="Latest Version"
              text={pkg.latestVersion}
            />
          ) : null}
          {pkg.wantedVersion && pkg.wantedVersion !== pkg.latestVersion ? (
            <List.Item.Detail.Metadata.Label
              title="Wanted Version"
              text={pkg.wantedVersion}
            />
          ) : null}
          {pkg.license ? (
            <List.Item.Detail.Metadata.Label
              title="License"
              text={pkg.license}
            />
          ) : null}
          {pkg.binNames.length > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Binaries"
              text={pkg.binNames.join(", ")}
            />
          ) : null}
          {pkg.path ? (
            <List.Item.Detail.Metadata.Label
              title="Install Path"
              text={pkg.path}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="npm"
            text="Package Page"
            target={getPackageUrl(pkg.name)}
          />
          {pkg.repositoryUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Repository"
              text="Open Repository"
              target={pkg.repositoryUrl}
            />
          ) : null}
          {pkg.homepageUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Homepage"
              text="Open Homepage"
              target={pkg.homepageUrl}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function RegistryPackageDetail(props: {
  pkg: RegistryPackage;
  installedVersion?: string;
}) {
  const { pkg, installedVersion } = props;

  return (
    <List.Item.Detail
      markdown={buildMarkdown(
        pkg.name,
        pkg.description,
        buildInstallCommand(pkg.name),
      )}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Latest Version"
            text={pkg.version}
          />
          {installedVersion ? (
            <List.Item.Detail.Metadata.Label
              title="Installed Version"
              text={installedVersion}
            />
          ) : null}
          {pkg.publisher ? (
            <List.Item.Detail.Metadata.Label
              title="Publisher"
              text={pkg.publisher}
            />
          ) : null}
          {pkg.maintainers.length > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Maintainers"
              text={pkg.maintainers.join(", ")}
            />
          ) : null}
          {formatDate(pkg.date) ? (
            <List.Item.Detail.Metadata.Label
              title="Published"
              text={formatDate(pkg.date)}
            />
          ) : null}
          {formatKeywords(pkg.keywords) ? (
            <List.Item.Detail.Metadata.Label
              title="Keywords"
              text={formatKeywords(pkg.keywords)}
            />
          ) : null}
          {formatScore(pkg.score) ? (
            <List.Item.Detail.Metadata.Label
              title="Search Score"
              text={formatScore(pkg.score)}
            />
          ) : null}
          {formatScore(pkg.quality) ? (
            <List.Item.Detail.Metadata.Label
              title="Quality"
              text={formatScore(pkg.quality)}
            />
          ) : null}
          {formatScore(pkg.popularity) ? (
            <List.Item.Detail.Metadata.Label
              title="Popularity"
              text={formatScore(pkg.popularity)}
            />
          ) : null}
          {formatScore(pkg.maintenance) ? (
            <List.Item.Detail.Metadata.Label
              title="Maintenance"
              text={formatScore(pkg.maintenance)}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="npm"
            text="Package Page"
            target={pkg.npmUrl}
          />
          {pkg.repositoryUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Repository"
              text="Open Repository"
              target={pkg.repositoryUrl}
            />
          ) : null}
          {pkg.homepageUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Homepage"
              text="Open Homepage"
              target={pkg.homepageUrl}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
