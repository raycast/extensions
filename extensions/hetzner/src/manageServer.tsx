import { ActionPanel, List, Action, Color, Icon, Keyboard } from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  getAllServers,
  rebootServer,
  shutdownServer,
  startServer,
  stopServer,
} from "./actions/server-api";
import { HetznerServer, HetznerStatus } from "./models/server";
import { getConfig } from "./config";
import { Project } from "./models/project";
import { createNewServer, getAllProjects } from "./actions/project-action";
import { navigateToManageProject } from "./actions/navigate-action";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [servers, setServers] = useState<HetznerServer[]>([]);
  const [selectedProject, setProject] = useState<Project>();

  const { consoleURL } = getConfig();

  useEffect(() => {
    updateSelectedProject();
    updateServersList();
  }, [selectedProject]);

  const updateSelectedProject = async (): Promise<void> => {
    const projects = await getAllProjects();

    const project = projects.find((project) => project.selected);

    if (selectedProject?.projectId !== project?.projectId) {
      setProject(project);
    }
  };

  const updateServersList = async (): Promise<void> => {
    if (!selectedProject) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setServers([]);
    const servers = await getAllServers(selectedProject);

    setServers(servers);
    setIsLoading(false);
  };

  const updateServerStatus = (serverId: number, state: HetznerStatus) => {
    const server = servers.find((server) => server.id === serverId);

    if (server === undefined) {
      return;
    }

    server.status = state;

    setServers([...servers]);
  };

  return (
    <List
      searchBarPlaceholder="Search server"
      isShowingDetail={!isLoading && servers.length !== 0}
      isLoading={isLoading}
      navigationTitle={selectedProject?.name}
    >
      <List.EmptyView
        icon={Icon.Bug}
        title="Please select a default project"
        actions={
          <ActionPanel>
            <Action
              title="Select Default Project"
              icon={Icon.RotateClockwise}
              onAction={() => navigateToManageProject()}
            />
          </ActionPanel>
        }
      />
      {selectedProject && (
        <>
          <List.Item
            icon={Icon.RotateClockwise}
            title="Actions"
            actions={
              <ActionPanel>
                <Action
                  title="Change Project"
                  icon={Icon.House}
                  onAction={() => navigateToManageProject()}
                />
                <Action
                  title="Refresh All Servers"
                  icon={Icon.RotateClockwise}
                  onAction={() => updateServersList()}
                />
                <Action
                  title="Create Server"
                  icon={Icon.Globe}
                  onAction={() => createNewServer(selectedProject.projectId)}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Project Name"
                      text={selectedProject.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Project Id"
                      text={selectedProject.projectId}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Permission"
                      text={selectedProject.permission}
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
          <List.Section title={`${servers.length.toString()} Servers`}>
            {servers.map((server) => (
              <List.Item
                key={server.id}
                icon="hetzner-icon.png"
                title={server.name}
                accessories={[
                  {
                    text: {
                      value: server.status,
                      color:
                        server.status === "running"
                          ? Color.Green
                          : server.status === "off"
                            ? Color.Red
                            : Color.Yellow,
                    },
                  },
                ]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Server Name"
                          text={server.name}
                        />
                        {server.public_net.ipv4 && (
                          <List.Item.Detail.Metadata.Label
                            title="IPv4"
                            icon="icon-globe.svg"
                            text={server.public_net.ipv4.ip}
                          />
                        )}
                        {server.public_net.ipv6 && (
                          <List.Item.Detail.Metadata.Label
                            title="IPv6"
                            icon="icon-globe.svg"
                            text={server.public_net.ipv6.ip}
                          />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Server Type"
                          text={server.server_type.name.toUpperCase()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="VCPU"
                          icon="icon-cpu.svg"
                          text={server.server_type.cores.toString()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="RAM"
                          icon="icon-ram.svg"
                          text={server.server_type.memory.toString()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Disk Local"
                          icon="icon-disk.svg"
                          text={`${server.server_type.disk.toString()} GB`}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Datacenter"
                          text={server.datacenter.name}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Price"
                          icon="icon-price.svg"
                          text={`${server.usedPrice?.price_monthly.gross}/month`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Location"
                          icon="icon-location.svg"
                          text={server.datacenter.location.city}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Country"
                          text={server.datacenter.location.country}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Network Zone"
                          text={server.datacenter.location.network_zone}
                        />
                        <List.Item.Detail.Metadata.Separator />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel title={server.name}>
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      shortcut={Keyboard.Shortcut.Common.Open}
                      url={`${consoleURL}/projects/${selectedProject?.projectId}/servers/${server.id}/overview`}
                    />
                    {selectedProject.permission === "readWrite" && (
                      <>
                        <Action
                          title="Power On"
                          icon={Icon.Play}
                          onAction={() =>
                            startServer(
                              selectedProject,
                              server,
                              updateServerStatus,
                            )
                          }
                        />
                        <Action
                          title="Reboot"
                          icon={Icon.RotateClockwise}
                          onAction={() =>
                            rebootServer(
                              selectedProject,
                              server,
                              updateServerStatus,
                            )
                          }
                        />
                        <Action
                          title="Power Off"
                          style={Action.Style.Destructive}
                          icon={Icon.Stop}
                          onAction={() =>
                            stopServer(
                              selectedProject,
                              server,
                              updateServerStatus,
                            )
                          }
                        />
                        <Action
                          title="Shutdown"
                          style={Action.Style.Destructive}
                          icon={Icon.Power}
                          onAction={() =>
                            shutdownServer(
                              selectedProject,
                              server,
                              updateServerStatus,
                            )
                          }
                        />
                      </>
                    )}

                    <ActionPanel.Section>
                      {server.public_net.ipv4 && (
                        <Action.CopyToClipboard
                          title="Copy IPv4 Address"
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          content={server.public_net.ipv4.ip}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Server Name"
                        content={server.name}
                      />
                      <Action.CopyToClipboard
                        title="Copy Server URL"
                        content={`${consoleURL}/projects/${selectedProject?.projectId}/servers/${server.id}/overview`}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
