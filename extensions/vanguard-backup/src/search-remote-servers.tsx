import { Action, ActionPanel, Color, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { buildApiUrl, callVanguard, headers, parseResponse, useVanguardPaginated } from "./vanguard";
import { CreateServer, Server, ServerStatusConnectivity } from "./types";

const SERVER_ACCESSORY: Partial<Record<ServerStatusConnectivity, List.Item.Accessory>> = {
  checking: { tag: { value: "Checking", color: Color.Purple } },
  online: { tag: { value: "Online", color: Color.Green } },
  offline: { tag: { value: "Offline", color: Color.Red } },
};

export default function SearchRemoteServers() {
  const { isLoading, data: servers, pagination, error, revalidate } = useVanguardPaginated<Server>("remote-servers");

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !servers.length && !error ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="You don't have any remote servers setup!"
          description="You can configure your first remote server by clicking the button below."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Remote Server" target={<AddRemoteServer />} onPop={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        servers.map((server) => (
          <List.Item
            key={server.id}
            icon={Icon.HardDrive}
            title={server.label}
            subtitle={server.connection.ip_address}
            accessories={[SERVER_ACCESSORY[server.status.connectivity] ?? { tag: server.status.connectivity }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Remote Server"
                  target={<AddRemoteServer />}
                  onPop={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddRemoteServer() {
  type FormValues = Omit<CreateServer, "port"> & {
    port: string;
  };

  const { pop } = useNavigation();
  const { isLoading, data } = useFetch<{ public_key: string }>(buildApiUrl("ssh-key"), {
    headers,
    parseResponse,
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.label);
      try {
        await callVanguard("remote-servers", {
          method: "POST",
          body: {
            ...values,
            port: +values.port,
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      port: "22",
    },
    validation: {
      label: FormValidation.Required,
      ip_address: FormValidation.Required,
      port: FormValidation.Required,
      username: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.HardDrive} title="Add Remote Server" onSubmit={handleSubmit} />
          {data && (
            <>
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push icon={Icon.Key} title="Show SSH Key" target={<Detail markdown={data.public_key} />} />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.CopyToClipboard title="Copy SSH Key" content={data.public_key} />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Public SSH Key"
        text="Copy the SSH key and run it on your intended remote server to give us secure access. We do not recommend using the root user."
      />
      <Form.TextField title="Label" {...itemProps.label} />
      <Form.TextField title="Host" {...itemProps.ip_address} />
      <Form.TextField title="SSH Port" {...itemProps.port} />
      <Form.TextField title="SSH Username" placeholder="user" {...itemProps.username} />
      <Form.PasswordField
        title="Database Password"
        info="The password is essential for performing database backup tasks. We encrypt the password upon receiving it."
        {...itemProps.database_password}
      />
    </Form>
  );
}
