import {
  Form,
  ActionPanel,
  showToast,
  Toast,
  showHUD,
  useNavigation,
  Action,
  Alert,
  confirmAlert,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { formatHours, isAxiosError, newTimeEntry, useCompany, useMyProjects } from "./services/harvest";
import { parseDuration } from "./services/parseDuration";
import { HarvestTimeEntry } from "./services/responseTypes";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import { find, groupBy, isDate, isEmpty, omitBy } from "es-toolkit/compat";

dayjs.extend(isToday);

export default function Command({
  onSave = async () => {
    return;
  },
  viewDate,
  entry,
}: {
  onSave: () => Promise<void>;
  entry?: HarvestTimeEntry;
  viewDate: Date | null;
}) {
  const { pop } = useNavigation();
  const { data: company, error } = useCompany();
  const { data: projects, isLoading: isLoadingProjects } = useMyProjects();
  const [projectId, setProjectId] = useState<string | null>(entry?.project.id.toString() ?? null);
  const [taskId, setTaskId] = useState<string | null>(entry?.task.id.toString() ?? null);
  const [notes, setNotes] = useState<string>(entry?.notes ?? "");
  const [hours, setHours] = useState<string>(formatHours(entry?.hours?.toFixed(2), company));
  const [hoursError, setHoursError] = useState<string | undefined>();
  const [spentDate, setSpentDate] = useState<Date>(viewDate ?? new Date());
  const { showClient = false, timeFormat = "company" } = getPreferenceValues<{
    showClient?: boolean;
    timeFormat?: "company" | "hours_minutes" | "decimal";
  }>();

  // Use useLocalStorage for persisting last used project/task
  const {
    value: lastProject,
    setValue: setLastProject,
    isLoading: isLoadingLastProject,
  } = useLocalStorage<{
    projectId: string;
    taskId: string;
  }>("lastProject");

  useEffect(() => {
    if (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Token",
          message: "Your API token or Account ID is invalid. Go to Raycast Preferences to update it.",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Unknown Error",
          message: "Could not get your company data",
        });
      }
    }
  }, [error]);

  const groupedProjects = useMemo(() => {
    // return an array of arrays thats grouped by client to easily group them via a map function
    const grouped = groupBy(projects, (o) => o.client.id);
    return Object.values(grouped);
  }, [projects]);

  useEffect(() => {
    if (!entry && lastProject) {
      setProjectId(lastProject?.projectId?.toString());
      setTaskId(lastProject?.taskId?.toString());
    }
  }, [entry, lastProject]);

  // Watch for changes to projectId to reset taskId unless the change is related to lastProject being loaded
  useEffect(() => {
    if (lastProject && lastProject.projectId !== projectId) setTaskId(null);
  }, [projectId]);

  async function handleSubmit(values: Record<string, Form.Value>) {
    if (values.project_id === null) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Project Selected",
      });
      return;
    }
    if (values.task_id === null) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Task Selected",
      });
      return;
    }

    const parsedHours = formatDuration(hours);
    if (hours && !parsedHours) {
      showToast({ style: Toast.Style.Failure, title: "Invalid Duration" });
      return;
    }
    const spentDate = isDate(values.spent_date) ? values.spent_date : viewDate;

    if (!company?.wants_timestamp_timers && !dayjs(spentDate).isToday() && !parsedHours)
      if (
        !(await confirmAlert({
          icon: Icon.ExclamationMark,
          title: "Warning",
          message:
            "You are about to start a timer on a different day (not today). Maybe you meant to enter some time on that day instead?",
          primaryAction: { title: "Start Timer", style: Alert.ActionStyle.Destructive },
        }))
      ) {
        return; // user canceled
      }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading..." });
    await toast.show();

    const data = omitBy(values, isEmpty);
    // Always include notes when editing to allow clearing
    if (entry?.id && !data.notes) {
      data.notes = "";
    }
    // Use parsed hours instead of raw form value
    if (parsedHours) {
      data.hours = parsedHours;
    }
    const timeEntry = await newTimeEntry(
      {
        ...data,
        project_id: parseInt(values.project_id.toString()),
        task_id: parseInt(values.task_id.toString()),
        spent_date: dayjs(spentDate).format("YYYY-MM-DD"),
      },
      entry?.id?.toString()
    ).catch(async (error) => {
      console.error(error.response.data);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.response.data.message,
      });
    });

    await setLastProject({ projectId: values.project_id.toString(), taskId: values.task_id.toString() });

    if (timeEntry) {
      toast.hide();
      await onSave();
      await showHUD(entry?.id ? "Time Entry Updated" : timeEntry.is_running ? "Timer Started" : "Time Entry Created");
      pop();
    }
  }

  const tasks = useMemo(() => {
    const project = find(projects, (o) => {
      return o.project.id === parseInt(projectId ?? "0");
    });
    return project ? project.task_assignments : [];
  }, [projects, projectId]);

  function formatDuration(value?: string): string | undefined {
    if (!value) {
      setHoursError(undefined);
      return undefined;
    }

    const duration = parseDuration(value);
    if (!duration) {
      setHoursError("Invalid duration");
      return undefined;
    }

    setHoursError(undefined);
    const totalMinutes = Math.round(duration.asMinutes());
    const useHoursMinutes =
      timeFormat === "hours_minutes" || (timeFormat === "company" && company?.time_format === "hours_minutes");

    let formatted: string;
    if (useHoursMinutes) {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      formatted = `${h}:${m < 10 ? "0" : ""}${m}`;
    } else {
      formatted = (totalMinutes / 60).toFixed(2);
    }
    setHours(formatted);
    return formatted;
  }

  return (
    <Form
      navigationTitle={entry?.id ? "Edit Time Entry" : "New Time Entry"}
      isLoading={!entry && ((!tasks.length && isLoadingProjects) || isLoadingLastProject)}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title={entry?.id ? "Update Time Entry" : hours ? "Create Time Entry" : "Start Timer"}
          />
        </ActionPanel>
      }
    >
      {showClient && (
        <Form.Description
          text={projects.find((o) => o.project.id === parseInt(projectId ?? "0"))?.client.name ?? ""}
          title="Client"
        />
      )}
      <Form.Dropdown
        id="project_id"
        title="Project"
        key={`project-${entry?.id}`}
        value={projectId ?? ""}
        onChange={setProjectId}
      >
        {groupedProjects?.map((groupedProject) => {
          const client = groupedProject[0].client;
          return (
            <Form.Dropdown.Section title={client.name} key={client.id}>
              {groupedProject.map((project) => {
                const code = project.project.code;
                return (
                  <Form.Dropdown.Item
                    keywords={[project.client.name.toLowerCase()]}
                    value={project.project.id.toString()}
                    title={`${code && code !== "" ? "[" + code + "] " : ""}${project.project.name}`}
                    key={project.id}
                  />
                );
              })}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown
        id="task_id"
        title="Task"
        value={tasks.find((t) => t.task.id.toString() === taskId) ? taskId ?? "" : ""}
        onChange={setTaskId}
      >
        {tasks?.map((task) => {
          return <Form.Dropdown.Item value={task.task.id.toString()} title={task.task.name} key={task.id} />;
        })}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea id="notes" title="Notes" value={notes} onChange={setNotes} />
      {company?.wants_timestamp_timers && (
        <>
          <Form.TextField id="started_time" title="Start Time" placeholder="Leave blank to default to now." />
          <Form.TextField id="ended_time" title="End Time" placeholder="Leave blank to start a new timer" />
        </>
      )}
      {!company?.wants_timestamp_timers && (
        <Form.TextField
          id="hours"
          title="Duration"
          placeholder="Leave blank to start a new timer"
          value={hours}
          error={hoursError}
          onChange={(v) => {
            setHours(v);
            setHoursError(undefined);
          }}
          onBlur={(e) => formatDuration(e.target.value)}
          info="You can enter numbers (decimal or h:mm format), simple durations (e.g. 1h30m), or simple time math (e.g. 1+15m-5m)"
        />
      )}
      <Form.DatePicker
        id="spent_date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={spentDate}
        onChange={(newValue) => newValue && setSpentDate(newValue)}
      />
    </Form>
  );
}
