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
  LocalStorage,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { isAxiosError, newTimeEntry, useCompany, useMyProjects } from "./services/harvest";
import { HarvestProjectAssignment, HarvestTaskAssignment, HarvestTimeEntry } from "./services/responseTypes";
import _ from "lodash";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
dayjs.extend(isToday);

export default function Command({
  onSave = async () => {
    return;
  },
  viewDate = new Date(),
  entry,
}: {
  onSave: () => Promise<void>;
  entry?: HarvestTimeEntry;
  viewDate?: Date;
}) {
  const { pop } = useNavigation();
  const { data: company, error } = useCompany();
  const { data: projects } = useMyProjects();
  const [projectId, setProjectId] = useState<string | undefined>(entry?.project.id.toString());
  const [tasks, setTasks] = useState<HarvestTaskAssignment[]>([]);
  const [taskId, setTaskId] = useState<string | undefined>(entry?.task.id.toString());
  const [notes, setNotes] = useState<string | undefined>(entry?.notes);
  const [hours, setHours] = useState<string | undefined>(entry?.hours.toString());
  const [spentDate, setSpentDate] = useState<Date>(viewDate);

  // console.log(projectId);

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
    if (!entry) {
      // no entry was passed, recall last submitted project/task
      LocalStorage.getItem("lastProject").then((value) => {
        console.log("restoring last used entry...", { value });
        if (value) {
          const { projectId, taskId } = JSON.parse(value.toString());
          setProjectId(projectId);
          setTaskId(taskId);
          setTaskAssignments(projectId);
        }
      });
    } else {
      // setTaskAssignments();
    }

    return () => {
      setProjectId(undefined);
    };
  }, [entry]);

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

    setTimeFormat(hours);
    const spentDate = _.isDate(values.spent_date) ? values.spent_date : viewDate;

    if (!company?.wants_timestamp_timers && !dayjs(spentDate).isToday() && !hours)
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

    const data = _.omitBy(values, _.isEmpty);
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

    await LocalStorage.setItem("lastProject", JSON.stringify({ projectId: values.project_id, taskId: values.task_id }));

    if (timeEntry) {
      toast.hide();
      await onSave();
      await showHUD(entry?.id ? "Time Entry Updated" : timeEntry.is_running ? "Timer Started" : "Time Entry Created");
      pop();
    }
  }

  function setTaskAssignments(projectId: string) {
    const project = _.find(projects, (o) => {
      return o.project.id === parseInt(projectId);
    });
    if (typeof project === "object") {
      setTasks(project.task_assignments);

      let defaultAssignment = project.task_assignments[0].task.id.toString();
      if (taskId) {
        // if there is already a taskId set, and it's a valid task for the selected project, leave it be
        const assignment = _.find(project.task_assignments, (o) => o.task.id.toString() === taskId);
        if (assignment) {
          defaultAssignment = assignment.task.id.toString();
        }
      }
      setTaskId(defaultAssignment);
    } else {
      // no projects found
      setTasks([]);
    }
    console.log("finished setTaskAssignments. taskId:", taskId);
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
      navigationTitle={entry?.id ? "Edit Time Entry" : "New Time Entry"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title={entry?.id ? "Update Time Entry" : hours ? "Create Time Entry" : "Start Timer"}
          />
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
            <Form.Dropdown.Section title={client.name} key={client.id}>
              {groupedProject.map((project) => {
                const code = project.project.code;
                return (
                  <Form.Dropdown.Item
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
      <Form.Dropdown id="task_id" title="Task" value={taskId} onChange={setTaskId}>
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
          placeholder="Enter numbers, or blank to start a new timer"
          value={hours}
          onChange={setHours}
        />
      )}
      <Form.DatePicker
        id="spent_date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={spentDate}
        onChange={setSpentDate}
      />
    </Form>
  );
}
