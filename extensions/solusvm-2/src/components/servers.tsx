import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { ApplicationResource, OsImageResource, Project, Server, SshKeyResource } from "../types";
import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, callApi, generateApiUrl } from "../api";
import Snapshots from "./snapshots";

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
    started: { color: Color.Green, text: "Running" },
    stopped: { color: Color.Red, text: "Stopped" },
    starting: { color: Color.Yellow, text: "Starting" },
    stopping: { color: Color.Yellow, text: "Stopping" },
    restarting: { color: Color.Orange, text: "Restarting" },
    reinstalling: { color: Color.Orange, text: "Reinstalling" },
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
          },
        }))
      )
        return;
    }

    let animatedToastTitle, successToastTitle, newStatus: Server["status"];
    switch (action) {
      case "start":
        animatedToastTitle = "Starting server";
        successToastTitle = "Started server";
        newStatus = "starting";
        break;
      case "stop":
        animatedToastTitle = "Stopping server";
        successToastTitle = "Stopped server";
        newStatus = "stopped";
        break;
      case "restart":
        animatedToastTitle = "Restarting server";
        successToastTitle = "Restarted server";
        newStatus = "restarting";
        break;
    }

    const toast = await showToast(Toast.Style.Animated, animatedToastTitle, project.name);
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
      toast.title = `Could not ${action} server`;
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
              <Action.Push icon={Icon.Camera} title="View Snapshots" target={<Snapshots serverId={server.id} />} />
              <Action.Push
                icon={Icon.Pencil}
                title="Update"
                target={<UpdateServer server={server} mutate={mutate} />}
              />
              {server.status === "started" && (
                <>
                  <Action icon={Icon.Stop} title="Stop" onAction={() => doServerAction(server, "stop")} />
                  <Action icon={Icon.Redo} title="Restart" onAction={() => doServerAction(server, "restart")} />
                </>
              )}
              {server.status === "stopped" && (
                <Action icon={Icon.Play} title="Start" onAction={() => doServerAction(server, "start")} />
              )}
              <Action.Push
                icon={Icon.ArrowClockwise}
                title="Reinstall Server"
                target={<ReinstallServer projectId={project.id} serverId={server.id} />}
              />
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
      <Form.TextField
        title="Hostname"
        placeholder="Hostname"
        info="The hostname will change the next time the server is restarted."
        {...itemProps.name}
      />
      <Form.TextField title="Description" placeholder="Description" {...itemProps.description} />
    </Form>
  );
}

function ReinstallServer({ projectId, serverId }: { projectId: number; serverId: number }) {
  const { isLoading: isLoadingOS, data: oses } = useFetch(generateApiUrl("os_images"), {
    headers: API_HEADERS,
    mapResult(result: { data: OsImageResource[] }) {
      return {
        data: result.data.filter((o) => o.is_visible),
      };
    },
    initialData: [],
  });
  const { isLoading: isLoadingApplication, data: applications } = useFetch(generateApiUrl("applications"), {
    headers: API_HEADERS,
    mapResult(result: { data: ApplicationResource[] }) {
      return {
        data: result.data.filter((a) => a.is_visible),
      };
    },
    initialData: [],
  });
  const { isLoading: isLoadingSSHKey, data: sshKeys } = useFetch(generateApiUrl(`projects/${projectId}/ssh_keys`), {
    headers: API_HEADERS,
    mapResult(result: { data: SshKeyResource[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  type FormValues = {
    type: string;
    os: string;
    application: string;
    ssh_keys: string[];
    password: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const options: Alert.Options = {
        title: "Reinstall server",
        message:
          "Reinstalling your server will power it down and overwrite its disk with the image you select. All previous data on the disk will be lost.",
        primaryAction: {
          title: "Reinstall",
        },
      };
      if (!(await confirmAlert(options))) return;

      const toast = await showToast(Toast.Style.Animated, "Reinstalling server", serverId.toString());
      try {
        const { os, application, ssh_keys, password } = values;
        const body = {
          ...(values.type === "os" ? { os: +os } : { application: +application }),
          ...(ssh_keys.length && { ssh_keys: ssh_keys.map((ssh) => +ssh) }),
          ...(values.password && { password }),
        };
        await callApi(`servers/${serverId}/reinstall`, { method: "POST", body });
        toast.style = Toast.Style.Success;
        toast.title = "Reinstalled";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not reinstall";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      type: "os",
      os: oses.find((o) => o.is_default)?.id.toString(),
      application: applications.find((a) => a.is_default)?.id.toString(),
    },
    validation: {
      os(value) {
        if (values.type === "os" && !value) return "The item is requireed";
      },
      application(value) {
        if (values.type === "application" && !value) return "The item is requireed";
      },
    },
  });

  return (
    <Form
      isLoading={isLoadingOS || isLoadingApplication || isLoadingSSHKey}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowClockwise} title="Reinstall Server" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Server Type" {...itemProps.type}>
        <Form.Dropdown.Item title="Operating System" value="os" />
        <Form.Dropdown.Item title="Applications" value="application" />
      </Form.Dropdown>
      {values.type === "os" ? (
        <Form.Dropdown title="Operating System" {...itemProps.os}>
          {oses.map((os) => (
            <Form.Dropdown.Item
              icon={os.icon.url}
              key={os.id}
              title={`${os.name} ${os.versions[0].version}`}
              value={os.id.toString()}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Dropdown title="Application" {...itemProps.application}>
          {applications.map((application) => (
            <Form.Dropdown.Item
              key={application.id}
              icon={application.icon.url}
              title={application.name}
              value={application.id.toString()}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.PasswordField
        title="Operating System Password"
        placeholder="Leave empty to keep it unchanged"
        {...itemProps.password}
      />
      <Form.TagPicker title="SSH Keys" placeholder="SSH Keys" {...itemProps.ssh_keys}>
        {sshKeys.map((sshKey) => (
          <Form.TagPicker.Item key={sshKey.id} icon={Icon.Key} title={sshKey.name} value={sshKey.id.toString()} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
