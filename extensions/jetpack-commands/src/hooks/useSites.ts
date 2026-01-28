import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { urlToSlug } from "../helpers/http-utils";
import { SITE_EXCERPT_REQUEST_FIELDS, SITE_EXCERPT_REQUEST_OPTIONS } from "../helpers/site-constants";
import { SiteExcerptData } from "../helpers/site-types";
import { useWPCOMClient } from "../helpers/withWPCOMClient";

// Gets the slug for a site, it also considers the unmapped URL,
// if the site is a redirect or the domain has a jetpack collision.
function getSiteSlug(site: SiteExcerptData) {
  if (!site) {
    return "";
  }
  return urlToSlug(site.URL);
}

export function useSites(siteFilter: string[] = [], sitesFilterFn?: (site: SiteExcerptData) => boolean) {
  const { wp } = useWPCOMClient();

  const { data, isLoading } = useCachedPromise(
    async () => {
      try {
        const data = await wp.me().sites({
          apiVersion: "1.2",
          site_visibility: "all",
          include_domain_only: true,
          site_activity: "active",
          fields: SITE_EXCERPT_REQUEST_FIELDS.join(","),
          options: SITE_EXCERPT_REQUEST_OPTIONS.join(","),
          filters: siteFilter.length > 0 ? siteFilter.join(",") : undefined,
        });
        const sites = data?.sites;
        const newSites = sitesFilterFn ? sites.filter(sitesFilterFn) : sites;
        return newSites.map((site: SiteExcerptData) => {
          return {
            ...site,
            slug: getSiteSlug(site),
          };
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch sites",
        });
        return [];
      }
    },
    [],
    {
      initialData: [],
    }
  );
  return { sites: data || [], isLoading };
}
