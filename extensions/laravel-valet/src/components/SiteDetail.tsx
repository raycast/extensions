import { ActionPanel, Detail, Icon } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { handleError } from "../utils";
import { getReadmeContents, getSite, getSecuredIcon, isSecured } from "../helpers/sites";
import SiteActions from "./SiteActions";
import { Site } from "../types/entities";

interface SiteDetailProps {
  siteId: string;
  mutateSites?: MutatePromise<Site[] | undefined>;
}

export default function SiteDetail({ siteId, mutateSites }: SiteDetailProps): JSX.Element {
  const {
    data: site,
    isLoading: isLoadingSite,
    error: getSiteError,
    mutate: mutateSiteDetail,
  } = useCachedPromise((siteId) => getSite(siteId), [siteId]);

  if (getSiteError) {
    handleError({ error: getSiteError, title: "Unable to get site detail" });
  }

  return (
    <Detail
      isLoading={isLoadingSite}
      navigationTitle={site?.name}
      {...(site
        ? {
            markdown: getReadmeContents(site),
            metadata: (
              <Detail.Metadata>
                <Detail.Metadata.Link title="URL" text={site.url} target={site.url} />
                <Detail.Metadata.Label title="Folder path" text={site.prettyPath} icon={Icon.Folder} />
                <Detail.Metadata.Label
                  title="Secured"
                  text={isSecured(site) ? "Yes" : "No"}
                  icon={getSecuredIcon(site)}
                />
                <Detail.Metadata.Label title="PHP version" text={site.prettyPath} icon={Icon.Document} />
              </Detail.Metadata>
            ),
            actions: (
              <ActionPanel>
                <SiteActions site={site} mutateSites={mutateSites} mutateSiteDetail={mutateSiteDetail} />
              </ActionPanel>
            ),
          }
        : {})}
    />
  );
}
