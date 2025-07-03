import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import {
  getCurrentDeviceConfig,
  getCurrentDeviceName,
  getAllDeviceConfigs,
  updateProjectLastUsed,
} from "../utils/config";
import { Project, DeviceConfig } from "../types";
import DeviceForm from "./device-form";
import Configure from "../configure";

interface ProjectListProps {
  onProjectAction: (project: Project, deviceConfig: DeviceConfig | undefined) => void;
  requiredFields?: string[];
  actionPanelExtra?: React.ReactNode;
  actionTitle: string;
}

export default function ProjectList({
  onProjectAction,
  requiredFields = ["name", "path"],
  actionPanelExtra,
  actionTitle,
}: ProjectListProps) {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allDeviceProjects, setAllDeviceProjects] = useState<Array<{ deviceName: string; projects: Project[] }>>([]);
  const [allDevices, setAllDevices] = useState<DeviceConfig[]>([]);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  const [currentDeviceName, setCurrentDeviceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setIsLoading(true);
      const allDevicesObj = getAllDeviceConfigs();
      const deviceEntries = Object.entries(allDevicesObj);
      const deviceList = deviceEntries.map(([, d]) => d);
      setAllDevices(deviceList);
      const hasNoDevice = deviceList.length === 0;

      if (hasNoDevice) {
        push(<Configure />);
        return;
      }

      const config = getCurrentDeviceConfig();
      const deviceName = getCurrentDeviceName();

      const allProjects: Array<{ deviceName: string; projects: Project[] }> = [];
      deviceEntries.forEach(([, deviceConfig]) => {
        if (deviceConfig.projects && deviceConfig.projects.length > 0) {
          allProjects.push({
            deviceName: deviceConfig.name,
            projects: deviceConfig.projects,
          });
        }
      });
      setAllDeviceProjects(allProjects);

      if (!config) {
        setDeviceConfig(null);
        setCurrentDeviceName(deviceName);
        setProjects([]);
        return;
      }

      setDeviceConfig(config);
      setCurrentDeviceName(deviceName);
      setProjects(config?.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Load Failed",
        message: "Unable to load project configuration",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      await loadProjects();
      await showToast({
        style: Toast.Style.Success,
        title: "Refresh Complete",
        message: "List has been updated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Refresh Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchText.toLowerCase()) ||
      project.path.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Current device has no configuration
  if (!deviceConfig) {
    // Other devices have projects
    if (allDeviceProjects.length > 0) {
      const allProjects = allDeviceProjects.flatMap(({ deviceName, projects }) =>
        projects.map((project) => ({ ...project, deviceName })),
      );
      const filteredAllProjects = allProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchText.toLowerCase()) ||
          project.path.toLowerCase().includes(searchText.toLowerCase()) ||
          project.deviceName.toLowerCase().includes(searchText.toLowerCase()),
      );
      const sortedAllProjects = filteredAllProjects.slice().sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));

      return (
        <List isLoading={isLoading} searchBarPlaceholder="Search projects..." onSearchTextChange={setSearchText}>
          <List.Section
            title={`No specific configuration for current device "${currentDeviceName}". Showing all projects from other devices. You can add configuration for the current device in the Actions panel.`}
          >
            {sortedAllProjects.map((project) => {
              const device = allDevices.find((d) => d.name === project.deviceName);
              return (
                <List.Item
                  key={`${project.deviceName}-${project.id}`}
                  icon={Icon.Folder}
                  title={project.name}
                  subtitle={project.path}
                  accessories={[{ text: `${project.deviceName}`, icon: Icon.Devices }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={actionTitle}
                        icon={Icon.Terminal}
                        onAction={() => {
                          if (device) {
                            updateProjectLastUsed(device, project.id);
                          }
                          onProjectAction(project, device);
                        }}
                        shortcut={{ modifiers: [], key: "return" }}
                      />
                      <Action title="Go to Configuration" icon={Icon.Gear} onAction={() => push(<Configure />)} />
                      <Action
                        title="Add Configuration for Current Device"
                        icon={Icon.Plus}
                        onAction={() =>
                          push(
                            <DeviceForm
                              initialData={{ name: currentDeviceName, cliPath: "", projects: [] }}
                              onSuccess={loadProjects}
                            />,
                          )
                        }
                      />
                      <Action
                        title="Refresh Project List"
                        icon={Icon.ArrowClockwise}
                        onAction={handleRefresh}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      {actionPanelExtra}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </List>
      );
    }

    // No device has projects
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
        <List.EmptyView
          icon={Icon.Devices}
          title="No Project Configurations Added"
          description="Please add project configuration first"
          actions={
            <ActionPanel>
              <Action
                title="Add Project Configuration"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <DeviceForm
                      initialData={{ name: currentDeviceName, cliPath: "", projects: [] }}
                      onSuccess={loadProjects}
                    />,
                  )
                }
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action
                title="Refresh Project List"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const missingFieldProject = projects.find((p) => requiredFields.some((f) => !p[f]));

  if (projects.length === 0) {
    const deviceInfo = `Current device "${currentDeviceName}"`;

    return (
      <List searchBarPlaceholder="Search projects...">
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects"
          description={`${deviceInfo} has no configured projects`}
          actions={
            <ActionPanel>
              <Action
                title="Go to Configuration"
                icon={Icon.Gear}
                onAction={() => push(<Configure />)}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action
                title="Refresh Project List"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              {actionPanelExtra}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (missingFieldProject) {
    return (
      <List searchBarPlaceholder="Search projects...">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Incomplete Project Configuration"
          description={`Some projects are missing required fields: ${requiredFields.join(", ")}`}
          actions={
            <ActionPanel>
              <Action
                title="Go to Configuration"
                icon={Icon.Gear}
                onAction={() => push(<Configure />)}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action
                title="Refresh Project List"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              {actionPanelExtra}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const sortedProjects = filteredProjects.slice().sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects..." onSearchTextChange={setSearchText}>
      {sortedProjects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Folder}
          title={project.name}
          subtitle={project.path}
          accessories={[{ text: "Current Device", icon: Icon.Devices }]}
          actions={
            <ActionPanel>
              <Action
                title={actionTitle}
                icon={Icon.Terminal}
                onAction={() => {
                  const device = allDevices.find((d) => d.name === currentDeviceName);
                  if (device) {
                    updateProjectLastUsed(device, project.id);
                  }
                  onProjectAction(project, device);
                }}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action title="Go to Configuration" icon={Icon.Gear} onAction={() => push(<Configure />)} />
              <Action.CopyToClipboard title="Copy Project Path" content={project.path} />
              <Action
                title="Refresh Project List"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              {actionPanelExtra}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
