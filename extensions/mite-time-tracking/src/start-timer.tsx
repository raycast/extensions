import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  closeMainWindow,
  popToRoot,
  LocalStorage,
} from "@raycast/api";
import React, { useState, useEffect, useMemo } from "react";
import { getProjects } from "./api/projects";
import { getServices } from "./api/services";
import { createTimeEntry } from "./api/time-entries";
import { startTracker } from "./api/tracker";
import { getCached, setCached } from "./utils/cache";
import { getFavoriteProjectIds } from "./utils/favorites";
import type { MiteProject, MiteService } from "./api/types";

export default function StartEntry() {
  const [projects, setProjects] = useState<MiteProject[]>([]);
  const [services, setServices] = useState<MiteService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<number[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);

        // Load last used service to pre-select it
        const lastServiceId =
          await LocalStorage.getItem<string>("lastUsedServiceId");

        // Load projects and services from cache or API
        let projectsData = getCached<MiteProject[]>("projects");
        let servicesData = getCached<MiteService[]>("services");

        if (!projectsData) {
          projectsData = await getProjects();
          setCached("projects", projectsData);
        }

        if (!servicesData) {
          servicesData = await getServices();
          setCached("services", servicesData);
        }

        // Load favorite project IDs
        const favorites = await getFavoriteProjectIds();

        if (!isMounted) return;

        setProjects(projectsData);
        setServices(servicesData);
        setFavoriteProjectIds(favorites);

        // Pre-select the last used service if available
        if (lastServiceId) {
          setSelectedServiceId(lastServiceId);
        }
      } catch (error) {
        if (!isMounted) return;

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter favorite projects
  const favoriteProjects = useMemo(() => {
    return projects.filter((project) =>
      favoriteProjectIds.includes(project.id),
    );
  }, [projects, favoriteProjectIds]);

  // Group projects by customer for better organization in dropdown
  const groupedProjects = useMemo(() => {
    const customerGroups = projects.reduce(
      (acc, project) => {
        const customerName = project.customer_name;
        if (!acc[customerName]) {
          acc[customerName] = [];
        }
        acc[customerName].push(project);
        return acc;
      },
      {} as Record<string, MiteProject[]>,
    );

    return Object.keys(customerGroups)
      .sort((a, b) => a.localeCompare(b))
      .map((customerName) => ({
        customerName,
        projects: customerGroups[customerName],
      }));
  }, [projects]);

  async function handleSubmit(values: {
    projectId: string;
    serviceId: string;
    note: string;
  }) {
    if (!values.projectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project Required",
        message: "Please select a project",
      });
      return;
    }

    if (!values.serviceId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Service Required",
        message: "Please select a service",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating Time Entry...",
      });

      // Create time entry
      const timeEntry = await createTimeEntry({
        project_id: Number(values.projectId),
        service_id: Number(values.serviceId),
        note: values.note.trim(),
        minutes: 0,
      });

      // Start tracker
      await startTracker(timeEntry.id);

      // Remember the selected service for next time
      await LocalStorage.setItem("lastUsedServiceId", values.serviceId);

      const project = projects.find((p) => p.id === Number(values.projectId));
      const projectName = project
        ? `${project.customer_name} - ${project.name}`
        : "Project";

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: `${projectName}`,
      });

      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Timer"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Project"
        placeholder="Choose a project"
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      >
        <Form.Dropdown.Item
          key="empty"
          value=""
          title="Select Project..."
          icon={Icon.Person}
        />
        {favoriteProjects.length > 0 && (
          <Form.Dropdown.Section title="Favorites">
            {favoriteProjects.map((project) => (
              <Form.Dropdown.Item
                key={`fav-${project.id}`}
                value={String(project.id)}
                title={`${project.customer_name} - ${project.name}`}
                icon={Icon.Star}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {groupedProjects.map(({ customerName, projects: customerProjects }) => (
          <Form.Dropdown.Section key={customerName} title={customerName}>
            {customerProjects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={String(project.id)}
                title={project.name}
                icon={Icon.Person}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="serviceId"
        title="Service"
        placeholder="Choose a service"
        value={selectedServiceId}
        onChange={setSelectedServiceId}
        info="Your last selected service will be remembered"
      >
        {!isLoading && !selectedServiceId && (
          <Form.Dropdown.Section>
            <Form.Dropdown.Item
              key="empty"
              value=""
              title="Select Service..."
              icon={Icon.Tag}
            />
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section title="Services">
          {services.map((service) => (
            <Form.Dropdown.Item
              key={service.id}
              value={String(service.id)}
              title={service.name}
              icon={Icon.Tag}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextArea
        id="note"
        title="Description"
        placeholder="Meaningful description of the activity..."
        value={note}
        onChange={setNote}
      />
    </Form>
  );
}
