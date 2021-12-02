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
import { useEffect, useState } from "react";
import { getCompany, getMyProjectAssignments, newTimeEntry } from "./services/harvest";
import { HarvestCompany, HarvestProjectAssignment, HarvestTaskAssignment } from "./services/responseTypes";
import _ from "lodash";
import moment from "moment";

export default function Command({
  onSave = () => {
    return null;
  },
}: {
  onSave: () => void;
}) {
  const { pop } = useNavigation();
  const [company, setCompany] = useState<HarvestCompany | undefined>(undefined);
  const [projects, setProjects] = useState<HarvestProjectAssignment[] | undefined>(undefined);
  const [tasks, setTasks] = useState<HarvestTaskAssignment[] | undefined>(undefined);
  async function handleSubmit(values: Record<string, FormValue>) {
    if (values.project_id === null) {
      return showToast(ToastStyle.Failure, "No Project Selected");
    }
    if (values.task_id === null) {
      return showToast(ToastStyle.Failure, "No Task Selected");
    }
    const toast = new Toast({ style: ToastStyle.Animated, title: "Loading..." });
    await toast.show();

    const data = _.omitBy(values, _.isEmpty);
    const timeEntry = await newTimeEntry({
      ...data,
      project_id: parseInt(values.project_id.toString()),
      task_id: parseInt(values.task_id.toString()),
      spent_date: values.spent_date === null ? moment().format("YYYY-MM-DD") : values.spent_date.toString(),
    }).catch(async (error) => {
      console.error(error.response.data);
      toast.hide();
      await showToast(ToastStyle.Failure, "Error", error.response.data.message);
    });

    if (timeEntry) {
      toast.hide();
      await showHUD(timeEntry.is_running ? "Timer Started" : "Time Entry Created");
      pop();
      onSave();
    }
  }

  function setTaskAssignments(project_id: string) {
    const project = _.find(projects, (o) => {
      return o.project.id === parseInt(project_id);
    });
    if (typeof project === "object") {
      setTasks(project.task_assignments);
    } else {
      setTasks(undefined);
    }
  }

  useEffect(() => {
    getCompany()
      .then((company) => {
        setCompany(company);
      })
      .catch((error) => {
        showToast(ToastStyle.Failure, "API Error", "Could not get your company's settings");
        console.error("projects", error.response);
      });
    getMyProjectAssignments()
      .then((projects) => {
        setProjects(projects);
      })
      .catch((error) => {
        showToast(ToastStyle.Failure, "API Error", "Could not get your projects");
        console.error("projects", error.response);
      });
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project_id" title="Project" storeValue={true} onChange={setTaskAssignments}>
        {projects?.map((project) => {
          return (
            <Form.DropdownItem
              value={project.project.id.toString()}
              title={`[${project.project.code}] ${project.project.name}`}
              key={project.id}
            />
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown id="task_id" title="Task" storeValue={true}>
        {tasks?.map((task) => {
          return <Form.DropdownItem value={task.task.id.toString()} title={task.task.name} key={task.id} />;
        })}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea id="notes" title="Notes" />
      {company?.wants_timestamp_timers && (
        <>
          <Form.TextField id="started_time" title="Start Time" placeholder="Leave blank to default to now." />
          <Form.TextField id="ended_time" title="End Time" placeholder="Leave blank to start a new timer" />
        </>
      )}
      {!company?.wants_timestamp_timers && (
        <Form.TextField id="hours" title="Duration" placeholder="Leave blank to start a new timer" />
      )}
      <Form.DatePicker id="spent_date" title="Date" />
    </Form>
  );
}
