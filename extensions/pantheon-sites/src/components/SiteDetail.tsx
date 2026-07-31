import { ActionPanel, confirmAlert, List, Action, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect } from "react";
import { terminusCmd } from "../utils";
import { Site, Environments, EnvInfo } from "../types";
import { SetAdminUrlForm, SITE_ADMIN_URLS_KEY } from "./SetAdminUrlForm";

const ENV_TITLES: Record<string, string> = {
  live: "Live",
  test: "Test",
  dev: "Development",
};

export function SiteDetail({ site, preferences }: { site: Site; preferences: Preferences }) {
  const [siteAdminUrl, setSiteAdminUrl] = useState<string | null>(null);

  useEffect(() => {
    LocalStorage.getItem<string>(SITE_ADMIN_URLS_KEY).then((raw) => {
      if (raw) {
        const overrides: Record<string, string> = JSON.parse(raw);
        setSiteAdminUrl(overrides[site.name] ?? null);
      }
    });
  }, [site.name]);

  const adminUrl = siteAdminUrl ?? preferences.wordpressAdminUrl;

  const { isLoading, data } = useExec(terminusCmd(preferences.terminusPath, `env:list ${site.name} --format=json`), {
    shell: true,
  });

  const [selectedSite, setSelectedSite] = useState("");
  const [selectedEnv, setSelectedEnv] = useState("");
  const [backup, setBackup] = useState(false);
  const [purgeCache, setPurgeCache] = useState(false);
  const [deploySite, setDeploySite] = useState(false);

  useExec(terminusCmd(preferences.terminusPath, `backup:create ${selectedSite}.${selectedEnv}`), {
    execute: !!backup && !!selectedSite && !!selectedEnv,
    shell: true,
    onData: async () => {
      await showToast({ style: Toast.Style.Success, title: "Site backup complete" });
    },
    onError: async (error) => {
      console.log(error);
      const t = await showToast({ style: Toast.Style.Failure, title: "Error backing up site" });
      setTimeout(() => t.hide(), 1000);
    },
    onWillExecute: async () => {
      await showToast({ style: Toast.Style.Animated, title: `Backing up ${selectedSite}.${selectedEnv} site` });
      setBackup(false);
      setSelectedSite("");
      setSelectedEnv("");
    },
  });

  useExec(terminusCmd(preferences.terminusPath, `env:clear-cache ${selectedSite}.${selectedEnv}`), {
    execute: !!purgeCache && !!selectedSite && !!selectedEnv,
    shell: true,
    onData: async () => {
      await showToast({ style: Toast.Style.Success, title: "Site cache purge complete" });
    },
    onError: async (error) => {
      console.log(error);
      const t = await showToast({ style: Toast.Style.Failure, title: "Error purging cache" });
      setTimeout(() => t.hide(), 1000);
    },
    onWillExecute: async () => {
      await showToast({
        style: Toast.Style.Animated,
        title: `Purging cache for ${selectedSite}.${selectedEnv} site`,
      });
      setPurgeCache(false);
      setSelectedSite("");
      setSelectedEnv("");
    },
  });

  useExec(terminusCmd(preferences.terminusPath, `env:deploy ${selectedSite}.${selectedEnv}`), {
    execute: !!deploySite && !!selectedSite && !!selectedEnv,
    shell: true,
    onData: async () => {
      await showToast({ style: Toast.Style.Success, title: "Deployment Complete!" });
    },
    onError: async (error) => {
      console.log(error);
      const t = await showToast({ style: Toast.Style.Failure, title: "Error deploying site" });
      setTimeout(() => t.hide(), 1000);
    },
    onWillExecute: async () => {
      await showToast({ style: Toast.Style.Animated, title: `Deploying ${selectedSite}.${selectedEnv} site` });
      setDeploySite(false);
      setSelectedSite("");
      setSelectedEnv("");
    },
  });

  const confirmPurgeCache = async (siteName: string, envId: string) => {
    if (await confirmAlert({ title: "Are you sure you want to purge the site Cache?" })) {
      setPurgeCache(true);
      setSelectedSite(siteName);
      setSelectedEnv(envId);
    }
  };

  const confirmDeploy = async (siteName: string, envId: string) => {
    if (await confirmAlert({ title: `Are you sure you want to deploy the ${siteName}.${envId} site?` })) {
      setDeploySite(true);
      setSelectedSite(siteName);
      setSelectedEnv(envId);
    }
  };

  let environments: { id: string; title: string; info: EnvInfo }[] = [];

  if (data) {
    let envData: Environments;
    try {
      envData = JSON.parse(data);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse environment data",
        message: "Unexpected Terminus output",
      });
      return null;
    }
    const order = ["dev", "test", "live"];
    const keys = Object.keys(envData).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
    environments = keys.map((key) => ({
      id: key,
      title: ENV_TITLES[key] || key,
      info: envData[key],
    }));
  }

  const isDeployable = (envId: string) => envId === "test" || envId === "live" || !["dev"].includes(envId);

  return (
    <List isShowingDetail isLoading={isLoading}>
      <List.Section title={site.name}>
        {environments.map((env) => (
          <List.Item
            title={env.title}
            key={env.id}
            subtitle={env.id !== env.title.toLowerCase() ? env.id : undefined}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.AppWindow}
                  title="Open Site"
                  url={`http://${env.id}-${site.name}.pantheonsite.io/`}
                />
                <Action.OpenInBrowser
                  icon={Icon.AppWindowList}
                  title="Open Admin"
                  url={`http://${env.id}-${site.name}.pantheonsite.io${adminUrl}`}
                />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Set Custom Admin URL"
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  target={
                    <SetAdminUrlForm
                      siteName={site.name}
                      currentUrl={siteAdminUrl ?? ""}
                      onSave={(url) => setSiteAdminUrl(url || null)}
                    />
                  }
                />
                <Action
                  icon={Icon.Terminal}
                  title="Create Backup"
                  onAction={() => {
                    setBackup(true);
                    setSelectedSite(site.name);
                    setSelectedEnv(env.id);
                  }}
                />
                <Action icon={Icon.Wand} title="Purge Cache" onAction={() => confirmPurgeCache(site.name, env.id)} />
                {isDeployable(env.id) && (
                  <Action icon={Icon.Rocket} title="Deploy" onAction={() => confirmDeploy(site.name, env.id)} />
                )}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="URL"
                      text={`http://${env.id}-${site.name}.pantheonsite.io/`}
                      target={`http://${env.id}-${site.name}.pantheonsite.io/`}
                    />
                    <List.Item.Detail.Metadata.Link
                      title={`Admin URL (${siteAdminUrl ? "custom" : "default"})`}
                      text={adminUrl}
                      target={`http://${env.id}-${site.name}.pantheonsite.io${adminUrl}`}
                    />
                    <List.Item.Detail.Metadata.Label title="Connection Mode" text={env.info.connection_mode ?? "—"} />
                    <List.Item.Detail.Metadata.Label title="PHP Version" text={env.info.php_version ?? "—"} />
                    <List.Item.Detail.Metadata.Label title="Locked" text={env.info.locked ? "Yes" : "No"} />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={env.info.created ? new Date(env.info.created * 1000).toLocaleDateString() : "—"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
