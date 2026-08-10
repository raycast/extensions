import { Icon, List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Site } from "../../api/Site";
import { IServer, ISite } from "../../types";
import { EnvFile } from "../configs/EnvFile";
import { NginxFile } from "../configs/NginxFile";
import { unwrapToken } from "../../lib/auth";
import { useIsSiteOnline } from "../../hooks/useIsSiteOnline";
import { useEffect, useState } from "react";
import { siteStatusState } from "../../lib/color";
import { DeployHistory } from "./DeployHistory";
import { useSites } from "../../hooks/useSites";

export const SiteSingle = ({ site, server }: { site: ISite; server: IServer }) => {
  const { sites } = useSites(server);
  const siteData = sites?.find((s) => s.id === site.id);
  const { url } = useIsSiteOnline(site);

  return (
    <List isLoading={!siteData?.id} searchBarPlaceholder="Search sites...">
      {siteData?.id ? (
        <List.Section title={`${server.name?.toUpperCase()} -> Sites -> ${siteData.name}`}>
          <List.Item
            id="open-on-forge"
            key="open-on-forge"
            title="Open on Laravel Forge"
            icon={{ source: "forge-icon-64.png" }}
            accessories={[{ text: "forge.laravel.com" }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://forge.laravel.com/servers/${server.id}/sites/${site.id}`} />
              </ActionPanel>
            }
          />
          {site.repository && <DeployListItem siteData={siteData} server={server} />}
          {site.repository && (
            <List.Item
              id="deploy-history"
              key="deploy-history"
              title="View deployment logs"
              accessories={[{ text: "press to view" }]}
              icon={Icon.List}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Deployment Logs"
                    icon={Icon.List}
                    target={<DeployHistory site={site} server={server} />}
                  />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            id="open-in-ssh"
            key="open-in-ssh"
            title={`Open SSH connection (${site.username})`}
            icon={Icon.Terminal}
            accessories={[{ text: `ssh://${site.username}@${server.ip_address}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`Open SSH Connection (${site.username})`}
                  url={`ssh://${site.username}@${server.ip_address}`}
                />
                <Action.CopyToClipboard
                  title="Copy SSH Connection String"
                  content={`ssh://${site.username}@${server.ip_address}`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            id="site-env"
            key="site-env"
            title="View .env file"
            icon={Icon.BlankDocument}
            accessories={[{ text: "press to view" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Open .env File"
                  icon={Icon.BlankDocument}
                  target={<EnvFile site={site} server={server} />}
                />
                <Action.OpenInBrowser
                  title="Edit on Forge"
                  url={`https://forge.laravel.com/servers/${server.id}/sites/${site.id}/environment`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            id="site-nginx"
            key="site-nginx"
            title="View nginx config"
            icon={Icon.BlankDocument}
            accessories={[{ text: "press to view" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Nginx Config"
                  icon={Icon.BlankDocument}
                  target={<NginxFile site={site} server={server} />}
                />
              </ActionPanel>
            }
          />
          {url && (
            <List.Item
              id="open-in-browser"
              key="open-in-browser"
              title="Open site in browser"
              icon={Icon.Globe}
              accessories={[{ text: url }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}
      {siteData?.id ? (
        <List.Section title="Site Additonal Information">
          {Object.entries({
            id: "Forge site ID",
            server_d: "Forge server ID",
            name: "Site name",
            aliases: "Aliases",
            is_secured: "SSL",
            deployment_url: "Deployment webhook Url",
            tags: "Tags",
            directory: "Directory",
            repository: "Repository",
            quick_deploy: "Quick deploy enabled",
            deployment_status: "Deploy status",
          }).map(([key, label]) => {
            const value = siteData[key as keyof ISite]?.toString() ?? "";
            return (
              value.length > 0 && (
                <List.Item
                  id={key}
                  key={key}
                  title={label}
                  accessories={[{ text: value }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={value ?? ""} />
                    </ActionPanel>
                  }
                />
              )
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
};

const DeployListItem = ({ siteData, server }: { siteData?: ISite; server: IServer }) => {
  const token = unwrapToken(server.api_token_key);
  const [lastDeployTime, setLastDeployTime] = useState(0);

  useEffect(() => {
    if (siteData?.deployment_status !== "deploying") return;
    // rerender every 1s to update the deployment status icon
    const id = setTimeout(() => setLastDeployTime(Date.now()), 1000);
    return () => clearTimeout(id);
  }, [siteData, lastDeployTime]);

  if (!siteData?.repository) return null;

  return (
    <List.Item
      id="site-deploy"
      key="site-deploy"
      title="Trigger deploy script"
      icon={Icon.ArrowRight}
      accessories={[
        { icon: siteData.deployment_status === "deploying" ? siteStatusState(siteData, true).icon : undefined },
        {
          text:
            siteData.deployment_status === "deploying"
              ? "deploying..."
              : siteData.deployment_status ?? "press to deploy",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Trigger Deploy Script"
            onAction={() => {
              showToast(Toast.Style.Success, "Deploying...");
              Site.deploy({ siteId: siteData.id, serverId: server.id, token }).catch(() =>
                showToast(Toast.Style.Failure, "Failed to trigger deploy script")
              );
            }}
          />
          <Action.Push
            icon={Icon.Document}
            title="View Deployment History"
            target={<DeployHistory site={siteData} server={server} />}
          />
        </ActionPanel>
      }
    />
  );
};
