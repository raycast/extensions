import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  List,
  OpenInBrowserAction,
  PushAction,
  setLocalStorageItem,
} from "@raycast/api";
import { useState } from "react";
import { Site } from "./api/Site";
import { IServer, ServerCommands } from "./Server";
import { siteStatusState, useIsMounted, usePolling } from "./helpers";
import { PLOI_PANEL_URL } from "./config";

export const SitesList = ({
  server: server,
  sites: sitesArray,
}: {
  server: IServer;
  sites: ISite[];
}) => {
  const [sites, setSites] = useState<ISite[]>(sitesArray);
  const isMounted = useIsMounted();
  usePolling(() =>
    Site.getAll(server).then(async (sites: ISite[] | undefined) => {
      if (isMounted.current && sites?.length) {
        setSites(sites);

        await setLocalStorageItem(
          `ploi-sites-${server.id}`,
          JSON.stringify(sites)
        );
      }
    })
  );

  return (
    <>
      {sites.map((site: ISite) => (
        <SiteListItem key={site.id} site={site} server={server} />
      ))}
    </>
  );
};

const SiteListItem = ({ site, server }: { site: ISite; server: IServer }) => {
  const { icon: stateIcon, text: stateText } = siteStatusState(site);
  return (
    <List.Item
      id={site.id.toString()}
      key={site.id}
      title={site.domain}
      subtitle={
        site.phpVersion ? "PHP version: " + String(site.phpVersion) ?? "" : ""
      }
      icon={stateIcon}
      accessoryIcon={siteStatusState(site).icon}
      accessoryTitle={stateText}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction
              icon={Icon.Globe}
              title="Open Site Info"
              target={<SitesSingleView site={site} server={server} />}
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

export const SitesSingleView = ({
  site,
  server,
}: {
  site: ISite;
  server: IServer;
}) => {
  const [current, setCurrent] = useState<ISite>(site);
  const isMounted = useIsMounted();

  usePolling(() =>
    Site.get(site, server).then((site: ISite | undefined) => {
      isMounted.current && site && setCurrent(site);
    })
  );
  return (
    <>
      <List searchBarPlaceholder="Search Sites...">
        <List.Section title={`Site Commands (${current.domain})`}>
          {site.hasRepository && (
            <List.Item
              id="site-deploy"
              key="site-deploy"
              title="Deploy"
              accessoryTitle="This will run the deploy script for your site"
              icon={Icon.Hammer}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    icon={Icon.Hammer}
                    title="Deploy"
                    onAction={() => Site.deploy(current, server)}
                  />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            id="site-flush-fastcgi-cache"
            key="site-flush-fastcgi-cache"
            title="Flush FastCGI Cache"
            accessoryTitle="This will flush the FastCGI cache"
            icon={Icon.ArrowClockwise}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  icon={Icon.Bubble}
                  title="Flush FastCGI Cache"
                  onAction={() => Site.flushFastCgiCache(current, server)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.Section title="Site Information">
          <List.Item
            id="open-in-ploi"
            key="open-in-ploi"
            title="Open In ploi.io"
            icon={Icon.Globe}
            accessoryTitle="ploi.io"
            actions={
              <ActionPanel>
                <OpenInBrowserAction
                  url={`${PLOI_PANEL_URL}/servers/${server.id}/sites/${site.id}`}
                />
              </ActionPanel>
            }
          />
          {Object.entries({
            id: "Site ID",
            serverId: "Server ID",
            domain: "Domain",
            webDirectory: "Public Directory",
            projectType: "Project Type",
            zeroDowntimeDeployment: "Zero-downtime Deployments Enabled",
          }).map(([key, label]) => {
            const value = current[key as keyof ISite]?.toString() ?? "";
            return (
              value.length > 0 && (
                <List.Item
                  id={key}
                  key={key}
                  title={label}
                  accessoryTitle={value}
                  icon={Icon.Document}
                  actions={
                    <ActionPanel>
                      <CopyToClipboardAction content={value ?? ""} />
                    </ActionPanel>
                  }
                />
              )
            );
          })}
        </List.Section>
      </List>
    </>
  );
};

export const SiteCommands = ({
  site,
  server,
}: {
  site: ISite;
  server: IServer;
}) => {
  let url;
  try {
    // The site may fail here if using Default
    url = new URL("https://" + site.name);
  } catch (error) {
    url = undefined;
  }
  return (
    <>
      {url && (
        <OpenInBrowserAction
          icon={Icon.Globe}
          title={`Open site in browser`}
          url={url.toString()}
        />
      )}
      {site.hasRepository && (
        <ActionPanel.Item
          icon={Icon.Hammer}
          title="Trigger deploy script"
          onAction={() => Site.deploy(site, server)}
        />
      )}
    </>
  );
};

export interface ISite {
  id: number;
  serverIid: number;
  name: string;
  webDirectory: string;
  status: string;
  hasRepository: boolean;
  zeroDowntimeDeployment: boolean;
  projectType: string;
  phpVersion: string;
  createdAt: string;
  domain: string;
}
