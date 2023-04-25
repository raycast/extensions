import { Icon, Action, showToast, Toast } from "@raycast/api";
import { Site } from "../../api/Site";
import { IServer, ISite } from "../../types";
import { unwrapToken } from "../../lib/auth";
import { useIsSiteOnline } from "../../hooks/useIsSiteOnline";

export const SiteCommands = ({ site, server }: { site: ISite; server: IServer }) => {
  const token = unwrapToken(server.api_token_key);
  const { url } = useIsSiteOnline(site);
  return (
    <>
      <Action.OpenInBrowser
        icon={{ source: "forge-icon-64.png" }}
        title="Open on Forge"
        url={`https://forge.laravel.com/servers/${server.id}/sites/${site.id}`}
      />
      {/* As fas as I'm aware only sites with a repo can deploy */}
      {site.repository && (
        <Action
          icon={Icon.ArrowClockwise}
          title="Trigger Deploy Script"
          onAction={() => {
            showToast(Toast.Style.Animated, "Deploying...");
            Site.deploy({ siteId: site.id, serverId: server.id, token }).catch(() =>
              showToast(Toast.Style.Failure, "Failed to trigger deploy script")
            );
          }}
        />
      )}
      {url && <Action.OpenInBrowser icon={Icon.Globe} title="Open Site in Browser" url={url.toString()} />}
    </>
  );
};
