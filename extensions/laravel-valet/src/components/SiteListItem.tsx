import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import SiteActions from "./SiteActions";
import SiteDetail from "./SiteDetail";
import { getSecuredIcon, getSecuredTooltip, isSecured } from "../helpers/sites";
import { Site } from "../types/entities";
import ValetActions from "./ValetActions";

interface SiteListItemProps {
  site: Site;
  mutateSites?: MutatePromise<Site[] | undefined>;
  isShowingDetail: boolean;
  setIsShowingDetail: (show: boolean) => void;
}

export function SiteListItem({
  site: site,
  mutateSites,
  isShowingDetail,
  setIsShowingDetail,
}: SiteListItemProps): JSX.Element {
  return (
    <List.Item
      title={{
        value: site.url.replace(isSecured(site) ? "https://" : "http://", ""),
        tooltip: site.url,
      }}
      subtitle={!isShowingDetail ? site.prettyPath : undefined}
      icon={Icon.Folder}
      accessories={[
        {
          icon: getSecuredIcon(site),
          tooltip: getSecuredTooltip(site),
        },
      ]}
      detail={<SiteDetail site={site} />}
      actions={
        <ActionPanel>
          <Action title="Show Details" onAction={() => setIsShowingDetail(!isShowingDetail)} icon={Icon.Sidebar} />
          <SiteActions site={site} mutateSites={mutateSites} />
          <ValetActions />
        </ActionPanel>
      }
    />
  );
}
