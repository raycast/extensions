import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getResourceColor, isValidCoolifyUrl } from "./lib/utils";
import useCoolify from "./lib/use-coolify";
import { MessageResult, ResourceDetails } from "./lib/types";
import { COOLIFY_URL } from "./lib/config";
import InvalidUrl from "./lib/components/invalid-url";
import { useState } from "react";

export default function Resources() {
  if (!isValidCoolifyUrl()) return <InvalidUrl />;

  const { isLoading, data: resources = [] } = useCoolify<ResourceDetails[]>("resources");

  const [action, setAction] = useState<{ resourceType: string; uuid: string; action: "stop" | "start" | "restart" }>({
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
              <Action.OpenInBrowser
                icon={Icon.Plus}
                title="Add Resource"
                url={new URL("servers", COOLIFY_URL).toString()}
              />
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
              { text: resource.type === "application" ? resource.destination.server.name : resource.server.name },
            ]}
            actions={
              <ActionPanel>
                {resource.status.startsWith("running:") && (
                  <>
                    <Action
                      icon={{ source: Icon.Stop, tintColor: Color.Red }}
                      title="Stop"
                      onAction={() => setAction({ resourceType: resource.type, uuid: resource.uuid, action: "stop" })}
                    />
                    <Action
                      icon={{ source: Icon.Redo, tintColor: Color.Orange }}
                      title="Redeploy"
                      onAction={() =>
                        setAction({ resourceType: resource.type, uuid: resource.uuid, action: "restart" })
                      }
                    />
                  </>
                )}
                {resource.status.startsWith("exited:") && (
                  <Action
                    icon={{ source: Icon.Play, tintColor: Color.Yellow }}
                    title="Deploy"
                    onAction={() => setAction({ resourceType: resource.type, uuid: resource.uuid, action: "start" })}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
