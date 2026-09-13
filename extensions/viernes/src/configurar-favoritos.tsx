import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";

type Preferences = {
  vikunjaUrl: string;
  vikunjaToken: string;
};

type Project = {
  id: number;
  title: string;
};

const FAVORITES_KEY = "favoriteProjectIds";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const storedFavorites = await LocalStorage.getItem<string>(FAVORITES_KEY);

      if (storedFavorites) {
        setFavoriteIds(JSON.parse(storedFavorites));
      }

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

  async function handleSubmit() {
    try {
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));

      await popToRoot();

      await showHUD(
        `★ ${favoriteIds.length} proyecto${
          favoriteIds.length === 1 ? "" : "s"
        } favorito${favoriteIds.length === 1 ? "" : "s"}`,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No se pudieron guardar los favoritos",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  function toggleFavorite(projectId: string, checked: boolean) {
    if (checked) {
      setFavoriteIds((current) => (current.includes(projectId) ? current : [...current, projectId]));
    } else {
      setFavoriteIds((current) => current.filter((id) => id !== projectId));
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Guardar Favoritos" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Seleccioná los proyectos que querés mostrar primero al crear una tarea." />

      {projects.map((project) => {
        const projectId = String(project.id);

        return (
          <Form.Checkbox
            key={project.id}
            id={`project-${project.id}`}
            label={project.title}
            value={favoriteIds.includes(projectId)}
            onChange={(checked) => toggleFavorite(projectId, checked)}
          />
        );
      })}
    </Form>
  );
}
