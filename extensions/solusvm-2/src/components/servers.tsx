import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Project, Server } from "../types";
import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, callApi, generateApiUrl } from "../api";

export default function Servers({ project }: { project: Project }) {
  const {
    isLoading,
    data: servers,
    mutate,
  } = useFetch(generateApiUrl(`projects/${project.id}/servers`), {
    headers: API_HEADERS,
    mapResult(result: { data: Server[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  function getIPText(server: Server) {
    const { ipv4, ipv6 } = server.ip_addresses;
    return ipv4.find((v4) => v4.is_primary)?.ip || ipv6.find((v6) => v6.primary_ip)?.primary_ip;
  }

  const STATUS_MAP: Record<Server["status"], { color: Color.ColorLike; text: string }> = {
    started: { color: "#80af26", text: "Running" },
    stopped: { color: "#d02d4b", text: "Stopped" },
    starting: { color: Color.Yellow, text: "Starting" },
    stopping: { color: Color.Yellow, text: "Stopping" },
    restarting: { color: Color.Orange, text: "Restarting" }
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  async function doServerAction(server: Server, action: "start" | "stop" | "restart") {
    if (action !== "start") {
      if (
        !(await confirmAlert({
          title: `${capitalize(action)} Server`,
          message: "Would you like to continue?",
          primaryAction: {
            title: `Yes, ${action}!`,
          }
        }))
      )
        return;
    }

    let animatedToastTitle, successToastTitle, newStatus: Server["status"];
    switch (action) {
      case "start":
        animatedToastTitle = "Starting project";
        successToastTitle = "Started project";
        newStatus = "starting";
        break;
      case "stop":
        animatedToastTitle = "Stopping project";
        successToastTitle = "Stopped project";
        newStatus = "stopped";
        break;
      case "restart":
        animatedToastTitle = "Restarting project";
        successToastTitle = "Restarted project";
        newStatus = "restarting"
        break;
    }

    const toast = await showToast(
      Toast.Style.Animated,
      animatedToastTitle,
      project.name,
    );
    try {
      await mutate(callApi(`servers/${server.id}/${action}`, { method: "POST" }), {
        optimisticUpdate(data) {
          return data.map((s) => (s.id === server.id ? { ...s, status: newStatus } : s));
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = successToastTitle;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${action} project`;
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {servers.map((server) => (
        <List.Item
          key={server.id}
          icon={{ value: server.settings.os_image.icon, tooltip: server.settings.os_image.name }}
          title={server.name}
          subtitle={server.description}
          accessories={[
            {
              icon: { source: Icon.CircleFilled, tintColor: STATUS_MAP[server.status].color },
              text: STATUS_MAP[server.status].text || server.status,
              tooltip: "Status",
            },
            { text: getIPText(server), tooltip: "IP address" },
            { icon: server.location.icon.url, text: server.location.icon.name, tooltip: "Location" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Update"
                target={<UpdateServer server={server} mutate={mutate} />}
              />
              {server.status === "started" && <>
              <Action icon={Icon.Stop} title="Stop" onAction={() => doServerAction(server, "stop")} />
              <Action icon={Icon.Redo} title="Restart" onAction={() => doServerAction(server, "restart")} />
              </>}
              {server.status === "stopped" && (
                <Action icon={Icon.Play} title="Start" onAction={() => doServerAction(server, "start")} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateServer({ server, mutate }: { server: Server; mutate: MutatePromise<Server[]> }) {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    description: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating server", server.id.toString());
      try {
        await mutate(
          callApi(`servers/${server.id}`, {
            method: "PATCH",
            body: values,
          }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Updated server";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update server";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: server.name,
      description: server.description,
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="ID" text={server.id.toString()} />
      <Form.TextField title="Hostname" placeholder="Hostname" info="The hostname will change the next time the server is restarted." {...itemProps.name} />
      <Form.TextField title="Description" placeholder="Description" {...itemProps.description} />
    </Form>
  );
}
