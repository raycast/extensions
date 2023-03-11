import { List } from "@raycast/api";
import { getReadmeContents, getSecuredIcon, isSecured } from "../helpers/sites";
import { Site } from "../types/entities";

interface SiteDetailProps {
  site: Site;
}

export default function SiteDetail({ site }: SiteDetailProps): JSX.Element {
  return (
    <List.Item.Detail
      {...(site
        ? {
            markdown: getReadmeContents(site) ?? undefined,
            metadata: (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={site.name} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="URL" text={site.url} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Folder path" text={site.prettyPath} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Secured"
                  text={isSecured(site) ? "Yes" : "No"}
                  icon={getSecuredIcon(site)}
                />
              </List.Item.Detail.Metadata>
            ),
          }
        : {})}
    />
  );
}
