import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import {
  ErrorResult,
  ListProjectsResult,
  ListServiceBackupsResult,
  ListServiceLogsResult,
  ListServicesResult,
  Project,
  Service,
  State,
} from "./interfaces";
import { Fragment } from "react/jsx-runtime";
import { filesize } from "filesize";

const API_URL = "https://api.aiven.io/v1/";
const { token } = getPreferenceValues<Preferences>();
const API_HEADERS = {
  Authorization: `aivenv1 ${token}`,
  "Content-Type": "application/json",
};
function useAiven<T>(endpoint: string, body?: Record<string, string>) {
  const { isLoading, data } = useFetch(API_URL + endpoint, {
    method: !body ? "GET" : "POST",
    headers: API_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    async parseResponse(response) {
      const result = (await response.json()) as ErrorResult | (object & T);
      if ("message" in result) throw new Error(result.message);
      return result;
    },
  });

  return { isLoading, data };
}

export default function Projects() {
  const { isLoading, data } = useAiven<ListProjectsResult>("project");
  return (
    <List isLoading={isLoading} isShowingDetail>
      {data?.projects.map((project) => (
        <List.Item
          key={project.project_name}
          icon={Icon.Folder}
          title={project.account_name}
          subtitle={project.project_name}
          keywords={[project.project_name]}
          accessories={[{ icon: Icon.Tag, tag: Object.keys(project.tags).length.toString() }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Tags" />
                  {Object.entries(project.tags).map(([key, val]) => (
                    <List.Item.Detail.Metadata.Label key={key} title={key} text={val} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Coin} title="View Services" target={<Services project={project} />} />
              <Action.OpenInBrowser
                url={`https://console.aiven.io/account/${project.account_id}/project/${project.project_name}/services`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Services({ project }: { project: Project }) {
  function getServiceIconColor(state: State) {
    switch (state) {
      case State.POWEROFF:
        return Color.Red;
      case State.REBALANCING:
        return Color.Yellow;
      case State.REBUILDING:
        return Color.Blue;
      case State.RUNNING:
        return Color.Green;
    }
  }

  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-project-details", false);

  const { isLoading, data } = useAiven<ListServicesResult>(`project/${project.project_name}/service`);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {data?.services.map((service) => {
        const markdown =
          service.cloud_description +
          `\n\n` +
          `
| - | - |
|---|---|
${Object.entries(service.metadata)
  .map(([key, val]) => `| ${key} | ${val} |`)
  .join(`\n`)}`;
        return (
          <List.Item
            key={service.service_name}
            icon={{
              value: { source: Icon.CircleFilled, tintColor: getServiceIconColor(service.state) },
              tooltip: service.state,
            }}
            title={service.service_name}
            subtitle={
              isShowingDetail ? undefined : { value: service.service_type, tooltip: service.service_type_description }
            }
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { tag: `Nodes (${service.node_count})` },
                    {
                      date: new Date(service.create_time),
                      tooltip: `Created: ${new Date(service.create_time).toDateString()}`,
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Features">
                      {Object.entries(service.features).map(([feature, active]) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={feature}
                          text={feature}
                          color={active ? Color.Green : Color.Red}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    {service.components.map((component, index) => (
                      <Fragment key={index}>
                        <List.Item.Detail.Metadata.Label title="Component" text={component.component} />
                        <List.Item.Detail.Metadata.Label title="Host" text={component.host} />
                        <List.Item.Detail.Metadata.Label title="Port" text={component.port.toString()} />
                        <List.Item.Detail.Metadata.Label title="Route" text={component.route} />
                        <List.Item.Detail.Metadata.Label title="Usage" text={component.usage} />
                        <List.Item.Detail.Metadata.Separator />
                      </Fragment>
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((show) => !show)}
                />
                <Action.Push
                  icon={Icon.SaveDocument}
                  title="View Backups"
                  target={<Backups project={project} service={service} />}
                />
                <Action.Push
                  icon={Icon.BulletPoints}
                  title="View Logs"
                  target={<Logs project={project} service={service} />}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
                <Action.OpenInBrowser
                  url={`https://console.aiven.io/account/${project.account_id}/project/${project.project_name}/services/${service.service_name}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Service"
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Warning, tintColor: Color.Yellow },
                      title: `Confirm deletion of service ${service.service_name}.`,
                      message: `Upon confirmation the following will happen immediately:

Service will stop serving clients
WARNING All service data will be irrecoverably lost
All configuration for this service is deleted
The service is deleted
Service billing will stop`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", service.service_name);
                          try {
                            const response = await fetch(
                              API_URL + `project/${project.project_name}/service/${service.service_name}`,
                              {
                                method: "DELETE",
                                headers: API_HEADERS,
                              },
                            );
                            if (!response.ok) {
                              const result = (await response.json()) as ErrorResult;
                              throw new Error(result.message);
                            }
                            toast.style = Toast.Style.Success;
                            toast.title = "Deleted";
                            await popToRoot();
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Backups({ project, service }: { project: Project; service: Service }) {
  const { isLoading, data } = useAiven<ListServiceBackupsResult>(
    `project/${project.project_name}/service/${service.service_name}/backups`,
  );

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
      hour12: false,
    };
    const formattedDate = date.toLocaleString("en-US", options).replace(",", "");
    return formattedDate + " UTC";
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        !data
          ? ""
          : `
| Data size | Backup time | Backup location |
|-----------|-------------|-----------------|
${data.backups.map((backup) => `| ${filesize(backup.data_size, { base: 2 })} | ${formatDate(backup.backup_time)} | ${backup.storage_location} |`).join("\n")}
`
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://console.aiven.io/account/${project.account_id}/project/${project.project_name}/services/${service.service_name}/backups`}
          />
        </ActionPanel>
      }
    />
  );
}

function Logs({ project, service }: { project: Project; service: Service }) {
  const { isLoading, data } = useAiven<ListServiceLogsResult>(
    `project/${project.project_name}/service/${service.service_name}/logs`,
    {
      sort_order: "desc",
    },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data?.logs.map((log, index) => (
        <List.Item
          key={log.time + index}
          icon={Icon.BulletPoints}
          title={log.time}
          detail={<List.Item.Detail markdown={log.msg} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={log.msg} />
              <Action.OpenInBrowser
                url={`https://console.aiven.io/account/${project.account_id}/project/${project.project_name}/services/${service.service_name}/logs`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
