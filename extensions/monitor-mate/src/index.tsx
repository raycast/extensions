import { List, ActionPanel, Action, Color, Icon, launchCommand, LaunchType, Detail, Keyboard } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { fetchResources, deleteResource, generateChartUrl } from "./utils";
import moment from "moment";
import { Resource } from "./types";

export default function Command() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isResourceLoading, setIsResourceLoading] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setIsResourceLoading(true);
    const fetchedResources = await fetchResources();
    setResources(fetchedResources);
    setIsResourceLoading(false);
  };

  const handleDelete = async (resource: Resource) => {
    await deleteResource(resource);
    loadResources();
  };

  const handleEdit = async (resource: Resource, index: number) => {
    await launchCommand({
      name: "add-resource",
      type: LaunchType.UserInitiated,
      context: { resource, index },
    });
  };

  const handleDetails = (resource: Resource) => {
    setSelectedResource(resource);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
    setSelectedResource(null);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? Icon.CircleFilled : Icon.XMarkCircleFilled;
  };

  const markdownChart = useMemo(() => {
    if (selectedResource) {
      const chartUrl = generateChartUrl(selectedResource.statusHistory);
      return `## Resource ${selectedResource.url}` + `![Chart](${chartUrl})`;
    }
    return "";
  }, [selectedResource]);

  const addResource = () => {
    return (
      <List.Item
        title="Add Resource"
        subtitle="Add a new resource to monitor"
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel title="Add Resource">
            <Action
              icon={Icon.PlusCircle}
              title="Add Resource"
              onAction={() => launchCommand({ name: "add-resource", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  };

  if (isDetailsOpen && selectedResource) {
    const chartUrl = generateChartUrl(selectedResource.statusHistory);
    return (
      <Detail
        isLoading={!chartUrl}
        markdown={markdownChart}
        navigationTitle={selectedResource.url + " Details"}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Resource URL" text={selectedResource.url} />
            <Detail.Metadata.Label title="Port" text={selectedResource.port} />
            <Detail.Metadata.Label
              title="Current Status"
              text={selectedResource.status ? "Up" : "Down"}
              icon={{
                source: getStatusIcon(selectedResource.status ?? false),
                tintColor: selectedResource.status ? Color.Green : Color.Red,
              }}
            />
            <Detail.Metadata.Label title="Last Checked" text={moment(selectedResource.lastChecked).fromNow()} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Status History"
              text={
                selectedResource.statusHistory.filter((status) => !status.status).length +
                " downtime in last 30 checks " +
                (selectedResource.statusHistory.filter((status) => !status.status).length > 0 ? " 😞" : " 😊")
              }
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action icon={Icon.XMarkCircleFilled} title="Close" onAction={closeDetails} />
            <Action
              icon={Icon.Pencil}
              title="Edit"
              onAction={() => handleEdit(selectedResource, resources.indexOf(selectedResource))}
            />
            <Action
              icon={Icon.Trash}
              title="Delete"
              style={Action.Style.Destructive}
              onAction={() => handleDelete(selectedResource)}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!isResourceLoading && resources.length === 0) {
    return <List>{addResource()}</List>;
  }

  return (
    <List navigationTitle="Search Resources">
      {resources.map((resource, index) => (
        <List.Item
          key={index}
          icon={{
            source: getStatusIcon(resource.status ?? false),
            tintColor: resource.status ? Color.Green : Color.Red,
          }}
          title={resource.url}
          subtitle={`Port: ${resource.port}`}
          accessories={[
            {
              text: `Last checked: ${moment(resource.lastChecked).fromNow()}`,
            },
            {
              text: resource.status ? "Up" : "Down",
            },
          ]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Eye} title="Details" onAction={() => handleDetails(resource)} />
              <Action icon={Icon.Pencil} title="Edit" onAction={() => handleEdit(resource, index)} />
              <Action
                icon={Icon.Trash}
                title="Delete"
                onAction={() => handleDelete(resource)}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}

      {addResource()}
    </List>
  );
}
