import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { siteStatusState } from "../../lib/color";
import { IServer, ISite } from "../../types";
import { ServerCommands } from "../actions/ServerCommands";
import { SiteSingle } from "./SiteSingle";
import { SiteCommands } from "../actions/SiteCommands";
import { useSites } from "../../hooks/useSites";
import { API_RATE_LIMIT } from "../../config";
import { useIsSiteOnline } from "../../hooks/useIsSiteOnline";
import { useEffect, useState } from "react";

export const SitesList = ({ server }: { server: IServer }) => {
  const refreshInterval = 60_000 / API_RATE_LIMIT + 100;
  const { sites, loading, error } = useSites(server, { refreshInterval });

  if (loading) return <List.Item title="Fetching sites..." />;
  if (error) return <List.Item title={error} />;
  if (!sites?.length) return <List.Item title="No sites found" />;

  return (
    <>
      {sites.map((site: ISite) => (
        <SiteListItem key={site.id} site={site} server={server} />
      ))}
    </>
  );
};

const SiteListItem = ({ site, server }: { site: ISite; server: IServer }) => {
  const [lastDeployTime, setLastDeployTime] = useState(0);
  const { isOnline, loading } = useIsSiteOnline(site);
  const { icon: stateIcon, text: stateText } = siteStatusState(site, loading ? true : isOnline);

  useEffect(() => {
    if (site?.deployment_status !== "deploying") return;
    // rerender every 1s to update the deployment status icon
    const id = setTimeout(() => setLastDeployTime(Date.now()), 1000);
    return () => clearTimeout(id);
  }, [site, lastDeployTime]);

  if (!site?.id) return null;
  return (
    <List.Item
      id={site.id.toString()}
      key={site.id}
      title={site?.name ?? "Site name undefined"}
      subtitle={site.repository ?? site.app ?? ""}
      icon={stateIcon}
      accessories={[{ text: stateText }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Site Info"
              icon={Icon.Binoculars}
              target={<SiteSingle site={site} server={server} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Site Commands">
            <SiteCommands site={site} server={server} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Server Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
