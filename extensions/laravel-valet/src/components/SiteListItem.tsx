import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import SiteActions from "./SiteActions";
import SiteDetail from "./SiteDetail";
import { getSecuredIcon, getSecuredTag, getSecuredTooltip, getUniqueId, isSecured } from "../helpers/sites";
import { Site } from "../types/entities";

interface SiteListItemProps {
  site: Site;
  mutateSites?: MutatePromise<Site[] | undefined>;
}

export function SiteListItem({ site: site, mutateSites }: SiteListItemProps): JSX.Element {
  return (
    <List.Item
      title={{
        value: site.url.replace(isSecured(site) ? "https://" : "http://", ""),
        tooltip: site.url,
      }}
      subtitle={site.prettyPath}
      icon={Icon.Folder}
      accessories={[
        {
          icon: getSecuredIcon(site),
          tooltip: getSecuredTooltip(site),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={<SiteDetail siteId={getUniqueId(site)} mutateSites={mutateSites} />}
            icon={Icon.Sidebar}
          />
          <SiteActions site={site} mutateSites={mutateSites} />
        </ActionPanel>
      }
    />
  );
}
