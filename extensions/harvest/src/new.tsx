// This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window = {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window.requestAnimationFrame = setTimeout;

import {
  Form,
  FormValue,
  ActionPanel,
  SubmitFormAction,
  showToast,
  ToastStyle,
  Toast,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { newTimeEntry, useCompany, useMyProjects } from "./services/harvest";
import { HarvestProjectAssignment, HarvestTaskAssignment, HarvestTimeEntry } from "./services/responseTypes";
import _ from "lodash";
import dayjs from "dayjs";

export default function Command({
  onSave = async () => {
    return;
  },
  viewDate = new Date(),
  entry,
}: {
  onSave: () => Promise<void>;
  entry?: HarvestTimeEntry;
  viewDate: Date;
}) {
  const { pop } = useNavigation();
  const { data: company, error } = useCompany();
  const { data: projects } = useMyProjects();
  const [projectId, setProjectId] = useState<string>();
  const [tasks, setTasks] = useState<HarvestTaskAssignment[]>([]);
  const [taskId, setTaskId] = useState<string>();
  const [notes, setNotes] = useState<string>();
  const [hours, setHours] = useState<string>();
  const [spentDate, setSpentDate] = useState<Date>();

  useEffect(() => {
    if (error) {
      if (error.isAxiosError && error.response?.status === 401) {
        showToast(
          ToastStyle.Failure,
          "Invalid Token",
          "Your API token or Account ID is invalid. Go to Raycast Preferences to update it."
        );
      } else {
        showToast(ToastStyle.Failure, "Unknown Error", "Could not get your company data");
      }
    }
  }, [error]);

  const groupedProjects = useMemo(() => {
    // return an array of arrays thats grouped by client to easily group them via a map function
    return _.reduce<
      _.Dictionary<[HarvestProjectAssignment, ...HarvestProjectAssignment[]]>,
      Array<Array<HarvestProjectAssignment>>
    >(
      _.groupBy(projects, (o) => o.client.id),
      (result, value) => {
        result.push(value);
        return result;
      },
      []
    );
  }, [projects]);

  useEffect(() => {
    if (!entry) return;

    setProjectId(entry.project.id.toString());
    setTaskId(entry.task.id.toString());
    setNotes(entry.notes);
    setHours(entry.hours.toString());
    setTaskAssignments();

    // const myDate = dayjs(entry.spent_date);
    console.log("new date", new Date(entry.spent_date ?? ""));
    // setSpentDate(new Date(entry.spent_date));
  }, [entry]);

  async function handleSubmit(values: Record<string, FormValue>) {
    if (values.project_id === null) {
      return showToast(ToastStyle.Failure, "No Project Selected");
    }
    if (values.task_id === null) {
      return showToast(ToastStyle.Failure, "No Task Selected");
    }
    const toast = new Toast({ style: ToastStyle.Animated, title: "Loading..." });
    await toast.show();

    setTimeFormat(hours);

    const spentDate = _.isDate(values.spent_date) ? values.spent_date : viewDate;

    const data = _.omitBy(values, _.isEmpty);
    const timeEntry = await newTimeEntry({
      ...data,
      project_id: parseInt(values.project_id.toString()),
      task_id: parseInt(values.task_id.toString()),
      spent_date: dayjs(spentDate).format("YYYY-MM-DD"),
    }).catch(async (error) => {
      console.error(error.response.data);
      await showToast(ToastStyle.Failure, "Error", error.response.data.message);
    });

    if (timeEntry) {
      toast.hide();
      await onSave();
      await showHUD(timeEntry.is_running ? "Timer Started" : "Time Entry Created");
      pop();
    }
  }

  function setTaskAssignments(projectId?: string) {
    if (!projectId) return;

    const project = _.find(projects, (o) => {
      return o.project.id === parseInt(projectId);
    });
    if (typeof project === "object") {
      setTasks(project.task_assignments);
      setTaskId(project.task_assignments[0].id.toString());
    } else {
      setTasks([]);
      setTaskId(undefined);
    }
  }

  function setTimeFormat(value?: string) {
    // This function can be called direclty from the onBlur event to better match the Harvest app behavior when it exists
    if (!value) return;

    if (company?.time_format === "decimal") {
      if (value.includes(":")) {
        const parsed = value.split(":");
        const hour = parseInt(parsed[0]);
        const minute = parseInt(parsed[1]);
        if (!isNaN(hour)) {
          if (!isNaN(minute)) {
            value = parseFloat(`${hour}.${minute / 60}`)
              .toFixed(2)
              .toString();
          } else {
            value = hour.toString();
          }
        }
      }
    }
    if (company?.time_format === "hours_minutes") {
      if (!value.includes(":")) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          const hour = Math.floor(parsed);
          const minute = parseInt(((parsed - hour) * 60).toFixed(0));
          value = `${hour}:${minute < 10 ? "0" : ""}${minute}`;
        }
      }
    }
    return setHours(value);
  }

  return (
    <Form
      navigationTitle={entry ? "Edit Time Entry" : "New Time Entry"}
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project_id"
        title="Project"
        value={projectId}
        onChange={(newValue) => {
          setProjectId(newValue);
          setTaskAssignments(newValue);
        }}
      >
        {groupedProjects?.map((groupedProject) => {
          const client = groupedProject[0].client;
          return (
            <Form.DropdownSection title={client.name} key={client.id}>
              {groupedProject.map((project) => {
                const code = project.project.code;
                return (
                  <Form.DropdownItem
                    value={project.project.id.toString()}
                    title={`${code && code !== "" ? "[" + code + "] " : ""}${project.project.name}`}
                    key={project.id}
                  />
                );
              })}
            </Form.DropdownSection>
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown id="task_id" title="Task" value={taskId}>
        {tasks?.map((task) => {
          return <Form.DropdownItem value={task.task.id.toString()} title={task.task.name} key={task.id} />;
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
          placeholder="Enter numbers, or blank to start a new timer"
          value={hours}
          onChange={setHours}
        />
      )}
      <Form.DatePicker id="spent_date" title="Date" value={spentDate} onChange={setSpentDate} />
    </Form>
  );
}
