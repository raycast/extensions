import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  showHUD,
  Toast,
  LocalStorage,
  popToRoot,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

type Preferences = {
  vikunjaUrl: string;
  vikunjaToken: string;
};

type Project = {
  id: number;
  title: string;
};

const LAST_PROJECT_KEY = "lastProjectId";
const FAVORITES_KEY = "favoriteProjectIds";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const [lastProjectId, storedFavorites] = await Promise.all([
        LocalStorage.getItem<string>(LAST_PROJECT_KEY),
        LocalStorage.getItem<string>(FAVORITES_KEY),
      ]);

      let loadedFavorites: string[] = [];

      if (storedFavorites) {
        try {
          loadedFavorites = JSON.parse(storedFavorites);
        } catch {
          loadedFavorites = [];
        }
      }

      setFavoriteIds(loadedFavorites);

      const response = await fetch(`${preferences.vikunjaUrl}/api/v1/projects`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${preferences.vikunjaToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Error ${response.status}: ${errorText || "No se pudieron cargar los proyectos"}`);
      }

      const data = await response.json();

      const projectList: Project[] = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];

      setProjects(projectList);

      if (lastProjectId && projectList.some((project) => String(project.id) === lastProjectId)) {
        setSelectedProject(lastProjectId);
      } else {
        const firstFavorite = projectList.find((project) => loadedFavorites.includes(String(project.id)));

        if (firstFavorite) {
          setSelectedProject(String(firstFavorite.id));
        } else if (projectList.length > 0) {
          setSelectedProject(String(projectList[0].id));
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No se pudieron cargar los proyectos",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const favoriteProjects = useMemo(
    () => projects.filter((project) => favoriteIds.includes(String(project.id))),
    [projects, favoriteIds],
  );

  const otherProjects = useMemo(
    () => projects.filter((project) => !favoriteIds.includes(String(project.id))),
    [projects, favoriteIds],
  );

  async function handleSubmit(values: { title: string; projectId: string }) {
    const title = values.title.trim();

    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Escribí una tarea",
      });

      return;
    }

    if (!values.projectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Seleccioná un proyecto",
      });

      return;
    }

    try {
      const response = await fetch(`${preferences.vikunjaUrl}/api/v1/projects/${values.projectId}/tasks`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${preferences.vikunjaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Error ${response.status}: ${errorText || "No se pudo crear la tarea"}`);
      }

      await LocalStorage.setItem(LAST_PROJECT_KEY, values.projectId);

      const project = projects.find((p) => String(p.id) === values.projectId);

      await popToRoot();

      await showHUD(`✓ Tarea creada${project ? ` en ${project.title}` : ""}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No se pudo crear la tarea",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Crear Tarea" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Tarea" placeholder="¿Qué tenés que hacer?" autoFocus />

      <Form.Dropdown id="projectId" title="Proyecto" value={selectedProject} onChange={setSelectedProject}>
        {favoriteProjects.length > 0 && (
          <Form.Dropdown.Section title="Favoritos">
            {favoriteProjects.map((project) => (
              <Form.Dropdown.Item key={project.id} value={String(project.id)} title={`★ ${project.title}`} />
            ))}
          </Form.Dropdown.Section>
        )}

        {otherProjects.length > 0 && (
          <Form.Dropdown.Section title="Otros proyectos">
            {otherProjects.map((project) => (
              <Form.Dropdown.Item key={project.id} value={String(project.id)} title={project.title} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
    </Form>
  );
}
