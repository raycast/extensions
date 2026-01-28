import { useCachedPromise } from "@raycast/utils";
import { Action, ActionPanel, Color, environment, Icon, Image, List } from "@raycast/api";
import { useContext } from "react";
import { SDKContext } from "./sdk";
import { DeploymentStatus } from "node-appwrite";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import Variables from "./sites/variables";
import CopyIDAction from "./common/CopyIDAction";
import { sortItems } from "./utils";
dayjs.extend(duration);
dayjs.extend(relativeTime);

export default function Sites() {
  const sdks = useContext(SDKContext);
  const {
    isLoading,
    data: sites,
    error,
  } = useCachedPromise(
    async () => {
      const res = await sdks.sites.list();
      return sortItems(res.sites);
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !sites.length && !error ? (
        <List.EmptyView
          title="Create your first site"
          description="Deploy and manage your web applications with Sites."
        />
      ) : (
        sites.map((site) => (
          <List.Item
            key={site.$id}
            icon={`https://cloud.appwrite.io/console/icons/${environment.appearance}/color/${site.framework}.svg`}
            title={site.name}
            accessories={[
              { icon: Icon.Plus, date: new Date(site.$createdAt), tooltip: `Created: ${site.$createdAt}` },
              { icon: Icon.Pencil, date: new Date(site.$updatedAt), tooltip: `Updated: ${site.$updatedAt}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Airplane} title="Deployments" target={<Deployments siteId={site.$id} />} />
                <Action.Push icon={Icon.Code} title="Variables" target={<Variables siteId={site.$id} />} />
                <CopyIDAction item={site} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const DEPLOYMENT_STATUS_ICON: Partial<Record<DeploymentStatus, { value: Image.ImageLike; tooltip: string }>> = {
  ready: { value: { source: Icon.Dot, tintColor: Color.Green }, tooltip: "Active" },
};
const formatSeconds = (seconds: number) => {
  const dur = dayjs.duration(seconds, "seconds");
  const formatted = `${dur.minutes()}m ${dur.seconds()}s`;
  return formatted;
};
function Deployments({ siteId }: { siteId: string }) {
  const { sites } = useContext(SDKContext);
  const { isLoading, data: deployments } = useCachedPromise(
    async () => {
      const res = await sites.listDeployments({ siteId });
      return sortItems(res.deployments);
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {deployments.map((deployment) => (
        <List.Item
          key={deployment.$id}
          icon={DEPLOYMENT_STATUS_ICON[deployment.status] || Icon.Dot}
          title={deployment.$id}
          subtitle={`Build duration: ${formatSeconds(deployment.buildDuration)}`}
          accessories={[
            { text: `Total size: ${filesize(deployment.totalSize)}` },
            deployment.type === "manual" ? { icon: Icon.Code, text: "Manual" } : { text: deployment.type },
          ]}
          actions={
            <ActionPanel>
              <CopyIDAction item={deployment} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
