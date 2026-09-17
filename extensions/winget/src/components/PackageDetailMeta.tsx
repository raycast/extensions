/**
 * Detail-pane metadata: ID, Moniker, version (installed +
 * available when an update exists), Author/Publisher (author only when it
 * differs), Release Date, License, Homepage (clickable), Tags.
 */

import { List } from "@raycast/api";

import { type WingetPackageDetails } from "../cli/types";
import { type PackageInfo } from "../utils/packages";

interface PackageDetailMetaProps {
  pkg: PackageInfo;
  details: WingetPackageDetails | undefined;
}

function detailMarkdown(details: WingetPackageDetails | undefined, isLoading: boolean): string {
  if (isLoading && !details) {
    return "";
  }
  return details?.description ?? "*No description available*";
}

function PackageDetailMeta({ pkg, details }: PackageDetailMetaProps) {
  const showAuthor = details?.author && details.author !== details.publisher;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="ID" text={pkg.id} />
      {details?.moniker && <List.Item.Detail.Metadata.Label title="Moniker" text={details.moniker} />}
      <List.Item.Detail.Metadata.Separator />

      {pkg.hasUpdate ? (
        <>
          <List.Item.Detail.Metadata.Label title="Installed" text={pkg.installedVersion ?? pkg.version} />
          <List.Item.Detail.Metadata.Label title="Available" text={pkg.availableVersion ?? "—"} />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Version" text={pkg.installedVersion ?? pkg.version} />
      )}

      {(showAuthor || details?.publisher || details?.releaseDate || details?.license || details?.homepage) && (
        <List.Item.Detail.Metadata.Separator />
      )}
      {showAuthor && <List.Item.Detail.Metadata.Label title="Author" text={details!.author!} />}
      {details?.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={details.publisher} />}
      {details?.releaseDate && <List.Item.Detail.Metadata.Label title="Release Date" text={details.releaseDate} />}
      {details?.license && <List.Item.Detail.Metadata.Label title="License" text={details.license} />}
      {details?.homepage && (
        <List.Item.Detail.Metadata.Link title="Homepage" target={details.homepage} text={details.homepage} />
      )}

      {details?.tags && details.tags.length > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Tags">
            {details.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export { detailMarkdown, PackageDetailMeta };
