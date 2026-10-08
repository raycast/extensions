import { Icon, List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Site } from "../../api/Site";
import { ConfigFile, IDeployment, IServer, ISite } from "../../types";
import { EnvFile } from "../configs/EnvFile";
import { NginxFile } from "../configs/NginxFile";
import { LogFile } from "../configs/LogFile";
import { unwrapToken } from "../../lib/auth";
import { useIsSiteOnline } from "../../hooks/useIsSiteOnline";
import { useEffect, useState } from "react";
import { siteStatusState } from "../../lib/color";
import { DeployHistory } from "./DeployHistory";
import { useSites } from "../../hooks/useSites";
import { repositoryLabel } from "../../lib/url";
import { formatDistance } from "date-fns";

const text = (value?: unknown) => (value === undefined || value === null ? "" : String(value));

const lastDeployLabel = (deployment?: IDeployment) => {
  if (!deployment?.started_at) return "press to deploy";
  const when = formatDistance(new Date(deployment.started_at), new Date(), { addSuffix: true });
  return `${deployment.status ?? "deployed"} ${when}`;
};

const logFiles: { type: ConfigFile; title: string; action: string }[] = [
  { type: "application-log", title: "View application log", action: "Open Application Log" },
  { type: "nginx-error-log", title: "View nginx error log", action: "Open Nginx Error Log" },
  { type: "nginx-access-log", title: "View nginx access log", action: "Open Nginx Access Log" },
];

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
            title={`Open SSH connection (${site.user})`}
            icon={Icon.Terminal}
            accessories={[{ text: `ssh://${site.user}@${server.ip_address}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title={`Open SSH Connection (${site.user})`}
                  url={`ssh://${site.user}@${server.ip_address}`}
                />
                <Action.CopyToClipboard
                  title="Copy SSH Connection String"
                  content={`ssh://${site.user}@${server.ip_address}`}
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
          {logFiles.map(({ type, title, action }) => (
            <List.Item
              id={type}
              key={type}
              title={title}
              icon={Icon.Receipt}
              accessories={[{ text: "press to view" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={action}
                    icon={Icon.Receipt}
                    target={<LogFile site={site} server={server} type={type} />}
                  />
                </ActionPanel>
              }
            />
          ))}
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
        <List.Section title="Site Additional Information">
          {[
            { key: "id", label: "Forge site ID", action: "Copy Forge Site ID", value: text(siteData.id) },
            {
              key: "server_id",
              label: "Forge server ID",
              action: "Copy Forge Server ID",
              value: text(siteData.server_id),
            },
            { key: "name", label: "Site name", action: "Copy Site Name", value: text(siteData.name) },
            { key: "aliases", label: "Aliases", action: "Copy Aliases", value: siteData.aliases?.join(", ") ?? "" },
            { key: "https", label: "SSL", action: "Copy SSL", value: text(siteData.https) },
            {
              key: "deployment_url",
              label: "Deployment webhook Url",
              action: "Copy Deployment Webhook URL",
              value: text(siteData.deployment_url),
            },
            {
              key: "web_directory",
              label: "Directory",
              action: "Copy Directory",
              value: text(siteData.web_directory),
            },
            {
              key: "repository",
              label: "Repository",
              action: "Copy Repository",
              value: repositoryLabel(siteData.repository),
            },
            {
              key: "quick_deploy",
              label: "Quick deploy enabled",
              action: "Copy Quick Deploy Enabled",
              value: text(siteData.quick_deploy),
            },
            {
              key: "deployment_status",
              label: "Deploy status",
              action: "Copy Deploy Status",
              value: text(siteData.deployment_status),
            },
          ].map(({ key, label, action, value }) => {
            return (
              value.length > 0 && (
                <List.Item
                  id={key}
                  key={key}
                  title={label}
                  accessories={[{ text: value }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title={action} content={value} />
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
            siteData.deployment_status === "deploying" ? "deploying..." : lastDeployLabel(siteData.latest_deployment),
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Trigger Deploy Script"
            onAction={() => {
              showToast(Toast.Style.Success, "Deploying...");
              Site.deploy({ orgSlug: server.org_slug, siteId: siteData.id, serverId: server.id, token }).catch(() =>
                showToast(Toast.Style.Failure, "Failed to trigger deploy script"),
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
