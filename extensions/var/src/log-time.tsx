import {
  Action,
  ActionPanel,
  Form,
  LaunchType,
  getPreferenceValues,
  launchCommand,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch, useForm } from "@raycast/utils";
import dayjs from "dayjs";
import constants from "./utils/constants";

type Values = {
  date: Date | null;
  description: string;
  minutes: string;
  project_id: string;
  is_billable: boolean;
  tag_ids: string[];
};

type Project = {
  id: number;
  name: string;
  state: string;
};

type ProjectsByClient = Record<string, Project[]>;

type Tag = {
  id: number;
  name: string;
};

type TagsResponse = {
  data: Tag[];
};

type EntryToEdit = {
  id: number;
  date: string;
  description: string;
  minutes: number;
  is_billable: boolean;
  project: {
    id: number;
  };
  tags: Array<{
    id: number;
  }>;
};

type CommandProps = {
  entryToEdit?: EntryToEdit;
  onDidSave?: () => void;
};

function parseDurationToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d+):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > 0 ? totalMinutes : null;
}

function formatMinutesToHHmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function Command({ entryToEdit, onDidSave }: CommandProps = {}) {
  const isEditing = Boolean(entryToEdit);
  const token = getPreferenceValues<Preferences>().apiKey;
  const { pop } = useNavigation();
  const {
    data: projectsByClient = {},
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useFetch<ProjectsByClient>(`${constants.API_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const {
    data: tagsResponse,
    isLoading: isTagsLoading,
    error: tagsError,
  } = useFetch<TagsResponse>(`${constants.API_URL}/tags`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const tags = tagsResponse?.data ?? [];

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      date: entryToEdit ? dayjs(entryToEdit.date).toDate() : new Date(),
      description: entryToEdit?.description ?? "",
      minutes: entryToEdit ? formatMinutesToHHmm(entryToEdit.minutes) : "",
      project_id: entryToEdit ? String(entryToEdit.project.id) : "",
      is_billable: entryToEdit?.is_billable ?? false,
      tag_ids: entryToEdit ? entryToEdit.tags.map((tag) => String(tag.id)) : [],
    },
    validation: {
      date: (value) => {
        if (!value) {
          return "La fecha es requerida";
        }
      },
      description: (value) => {
        if (!value?.trim()) {
          return "La descripcion es requerida";
        }
      },
      minutes: (value) => {
        if (parseDurationToMinutes(value ?? "") === null) {
          return "Usa formato HH:mm, por ejemplo 01:30";
        }
      },
      project_id: (value) => {
        if (!isEditing && !value) {
          return "Selecciona un proyecto";
        }
      },
    },
    async onSubmit(values) {
      const minutes = parseDurationToMinutes(values.minutes);
      if (minutes === null) {
        return;
      }

      const projectId = Number(values.project_id);
      const tagIds = values.tag_ids
        .map((tagId) => Number(tagId))
        .filter((tagId) => Number.isInteger(tagId) && tagId > 0);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEditing ? "Actualizando registro de tiempo..." : "Creando registro de tiempo...",
      });

      try {
        const response = await fetch(
          isEditing && entryToEdit
            ? `${constants.API_URL}/time-entries/${entryToEdit.id}`
            : `${constants.API_URL}/time-entries`,
          {
            method: isEditing ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              date: dayjs(values.date as Date).format("YYYY-MM-DD"),
              description: values.description.trim(),
              minutes,
              is_billable: values.is_billable,
              tag_ids: tagIds,
              ...(!isEditing ? { project_id: projectId } : {}),
            }),
          },
        );

        if (!response.ok) {
          let message = `Error ${response.status}`;
          try {
            const errorPayload = (await response.json()) as { message?: string };
            if (errorPayload.message) {
              message = errorPayload.message;
            }
          } catch {
            // no-op
          }

          toast.style = Toast.Style.Failure;
          toast.title = isEditing ? "No se pudo actualizar el registro" : "No se pudo crear el registro";
          toast.message = message;
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = isEditing ? "Registro actualizado" : "Registro creado";
        toast.message = "La entrada de tiempo se guardo correctamente";
        onDidSave?.();
        if (isEditing) {
          pop();
        } else {
          await launchCommand({ name: "time-entries", type: LaunchType.UserInitiated });
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error de red";
        toast.message = error instanceof Error ? error.message : "Error desconocido";
      }
    },
  });

  return (
    <Form
      isLoading={isProjectsLoading || isTagsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Time Entry" : "Create Time Entry"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {projectsError ? <Form.Description text={`No se pudieron cargar proyectos: ${projectsError.message}`} /> : null}
      {tagsError ? <Form.Description text={`No se pudieron cargar tags: ${tagsError.message}`} /> : null}
      <Form.DatePicker title="Date" type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.TextArea title="Description" placeholder="Describe el trabajo realizado" {...itemProps.description} />
      <Form.TextField title="Tiempo" placeholder="HH:mm (ej. 01:30)" {...itemProps.minutes} />
      {!isEditing ? (
        <Form.Dropdown title="Proyecto" placeholder="Selecciona un proyecto" {...itemProps.project_id}>
          {Object.entries(projectsByClient)
            .sort(([clientA], [clientB]) => clientA.localeCompare(clientB))
            .map(([clientName, projects]) => (
              <Form.Dropdown.Section key={clientName} title={clientName}>
                {projects
                  .filter((project) => project.state === "active")
                  .map((project) => (
                    <Form.Dropdown.Item key={project.id} value={String(project.id)} title={project.name} />
                  ))}
              </Form.Dropdown.Section>
            ))}
        </Form.Dropdown>
      ) : null}
      <Form.Checkbox title="Is billable" label="Facturable" {...itemProps.is_billable} />
      <Form.TagPicker title="Tags" placeholder="Selecciona tags" {...itemProps.tag_ids}>
        {tags
          .slice()
          .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name))
          .map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={String(tag.id)} title={tag.name} />
          ))}
      </Form.TagPicker>
    </Form>
  );
}
