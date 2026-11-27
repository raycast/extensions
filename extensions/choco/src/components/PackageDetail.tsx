import { Color, List } from "@raycast/api";
import {
  ChocoPackage,
  InstalledPackage,
  OutdatedPackage,
} from "../choco/types";

interface PackageDetailProps {
  id: string;
  pkg?: ChocoPackage;
  installed?: InstalledPackage;
  outdated?: OutdatedPackage;
}

function formatDownloads(count?: number): string | undefined {
  if (count === undefined) {
    return undefined;
  }
  return count.toLocaleString("en-US");
}

export function PackageDetail({
  id,
  pkg,
  installed,
  outdated,
}: PackageDetailProps) {
  const title = pkg?.title || id;
  const body =
    pkg?.description || pkg?.summary || "No detailed description available.";
  const markdown = `# ${title}\n\n${body}`;

  const latestVersion = outdated?.availableVersion ?? pkg?.version;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Package ID" text={id} />
          {latestVersion && (
            <List.Item.Detail.Metadata.Label
              title="Latest Version"
              text={latestVersion}
            />
          )}
          {installed && (
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={`Installed ${installed.version}`}
                color={outdated ? Color.Orange : Color.Green}
              />
              {installed.pinned && (
                <List.Item.Detail.Metadata.TagList.Item
                  text="Pinned"
                  color={Color.Yellow}
                />
              )}
            </List.Item.Detail.Metadata.TagList>
          )}
          {pkg?.authors && (
            <List.Item.Detail.Metadata.Label
              title="Authors"
              text={pkg.authors}
            />
          )}
          {pkg?.downloadCount !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Downloads"
              text={formatDownloads(pkg.downloadCount)}
            />
          )}
          {pkg?.published && (
            <List.Item.Detail.Metadata.Label
              title="Published"
              text={pkg.published.slice(0, 10)}
            />
          )}
          {pkg?.dependencies && pkg.dependencies.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Dependencies"
              text={pkg.dependencies.join(", ")}
            />
          )}
          {pkg?.tags && pkg.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {pkg.tags.slice(0, 8).map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {(pkg?.projectUrl || pkg?.packageUrl || pkg?.licenseUrl) && (
            <List.Item.Detail.Metadata.Separator />
          )}
          {pkg?.projectUrl && (
            <List.Item.Detail.Metadata.Link
              title="Homepage"
              target={pkg.projectUrl}
              text={pkg.projectUrl}
            />
          )}
          {pkg?.packageUrl && (
            <List.Item.Detail.Metadata.Link
              title="Chocolatey Page"
              target={pkg.packageUrl}
              text="Open Package"
            />
          )}
          {pkg?.licenseUrl && (
            <List.Item.Detail.Metadata.Link
              title="License"
              target={pkg.licenseUrl}
              text="View License"
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
