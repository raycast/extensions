import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { getResourceColor, getResourceTypeEndpoint, isValidCoolifyUrl } from "./lib/utils";
import useCoolify from "./lib/use-coolify";
import { MessageResult, ResourceDetails } from "./lib/types";
import InvalidUrl from "./lib/components/invalid-url";
import { useState } from "react";
import OpenInCoolify from "./lib/components/open-in-coolify";
import { useForm } from "@raycast/utils";

export default function Resources() {
  if (!isValidCoolifyUrl()) return <InvalidUrl />;

  const { isLoading, data: resources = [], revalidate } = useCoolify<ResourceDetails[]>("resources");

  const [action, setAction] = useState<{
    resourceType: string;
    uuid: string;
    action: "stop" | "start" | "restart";
  }>({
    resourceType: "",
    uuid: "",
    action: "stop",
  });
  const { isLoading: isExecuting } = useCoolify<MessageResult>(
    `${action.resourceType}s/${action.uuid}/${action.action}`,
    {
      method: "GET",
      execute: Boolean(action.resourceType && action.uuid),
      async onData(data) {
        await showToast(Toast.Style.Success, data.message);
        revalidate();
        setAction((prev) => ({ ...prev, uuid: "" }));
      },
      onError() {
        setAction((prev) => ({ ...prev, uuid: "" }));
      },
    },
  );

  return (
    <List isLoading={isLoading || isExecuting} searchBarPlaceholder="Search resource">
      {!isLoading && !resources.length ? (
        <List.EmptyView
          title="No resources found."
          description="Go online to add a resource."
          actions={
            <ActionPanel>
              <OpenInCoolify icon={Icon.Plus} title="Add Resource" url="servers" />
            </ActionPanel>
          }
        />
      ) : (
        resources.map((resource) => (
          <List.Item
            key={resource.uuid}
            icon={{ source: Icon.CircleFilled, tintColor: getResourceColor(resource) }}
            title={resource.name}
            subtitle={resource.type}
            accessories={[
              { icon: Icon.HardDrive },
              { text: "server" in resource ? resource.server.name : resource.destination.server.name },
            ]}
            actions={
              <ActionPanel>
                {resource.status.startsWith("running:") && (
                  <>
                    <Action
                      icon={{ source: Icon.Stop, tintColor: Color.Red }}
                      title="Stop"
                      onAction={() =>
                        setAction({
                          resourceType: getResourceTypeEndpoint(resource.type),
                          uuid: resource.uuid,
                          action: "stop",
                        })
                      }
                    />
                    <Action
                      icon={{ source: Icon.Redo, tintColor: Color.Orange }}
                      title="Redeploy"
                      onAction={() =>
                        setAction({
                          resourceType: getResourceTypeEndpoint(resource.type),
                          uuid: resource.uuid,
                          action: "restart",
                        })
                      }
                    />
                  </>
                )}
                {resource.status.startsWith("exited:") && (
                  <Action
                    icon={{ source: Icon.Play, tintColor: Color.Yellow }}
                    title="Deploy"
                    onAction={() =>
                      setAction({
                        resourceType: getResourceTypeEndpoint(resource.type),
                        uuid: resource.uuid,
                        action: "start",
                      })
                    }
                  />
                )}
                <Action.Push
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  title="Delete"
                  target={
                    <DeleteResource
                      resourceType={getResourceTypeEndpoint(resource.type)}
                      uuid={resource.uuid}
                      onDelete={revalidate}
                    />
                  }
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function DeleteResource({
  resourceType,
  uuid,
  onDelete,
}: {
  resourceType: string;
  uuid: string;
  onDelete: () => void;
}) {
  const [execute, setExecute] = useState(false);
  const { pop } = useNavigation();
  type FormValues = {
    delete_volumes: boolean;
    delete_connected_networks: boolean;
    delete_configurations: boolean;
    docker_cleanup: boolean;
  };

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      delete_volumes: true,
      delete_connected_networks: true,
      delete_configurations: true,
      docker_cleanup: true,
    },
  });

  const { isLoading } = useCoolify<MessageResult>(
    `${resourceType}s/${uuid}?` +
      new URLSearchParams({
        delete_volumes: values.delete_volumes.toString(),
        delete_connected_networks: values.delete_connected_networks.toString(),
        delete_configurations: values.delete_configurations.toString(),
        docker_cleanup: values.docker_cleanup.toString(),
      }).toString(),
    {
      method: "DELETE",
      execute,
      async onData(data) {
        await showToast(Toast.Style.Success, data.message);
        onDelete();
        pop();
      },
      onError() {
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Trash}
            title="Confirm Resource Deletion"
            onSubmit={handleSubmit}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Confirm Resource Deletion?" />
      <Form.Checkbox label="Permanently delete all volumes." {...itemProps.delete_volumes} />
      <Form.Checkbox label="Permanently delete all non-predefined networks." {...itemProps.delete_connected_networks} />
      <Form.Checkbox
        label="Permanently delete all configuration files from the server."
        {...itemProps.delete_configurations}
      />
      <Form.Checkbox label="Run Docker Cleanup." {...itemProps.docker_cleanup} />
    </Form>
  );
}
