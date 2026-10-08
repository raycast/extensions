import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Task } from "../../tasks/types";
import { startActivity } from "../api";
import { fetchProjects } from "../../projects/api";
import { Project } from "../../projects/types";
import { toDecimalTime } from "../utils";

interface ActivityStartProps {
  task?: Task;
  projectID?: number | null;
}

export const ActivityStart: React.FC<ActivityStartProps> = ({ task, projectID }) => {
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [startTimer, setStartTimer] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectID, setSelectedProjectID] = useState<string>("0");
  const [taskProjectID, setTaskProjectID] = useState<number | null>(
    projectID ? projectID : task ? task.projectID : null,
  );
  const [taskID, setTaskID] = useState<number | null>(task ? task.id : null);

  const navi = useNavigation();

  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  const refreshItems = async () => {
    setProjects(await fetchProjects());
  };

  useEffect(() => {
    refreshItems();
  }, []);

  return (
    <Form
      navigationTitle={task ? `${task.projectName}/${task.name}` : "New Activity"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={startTimer ? Icon.Stopwatch : Icon.SaveDocument}
            title={`${startTimer ? "Start Timer" : "Log Work"}`}
            onSubmit={(values) =>
              startActivity({
                ...values,
                hours: values.hours.includes(":") ? toDecimalTime(values.hours) : values.hours,
                date: values.date.toISOString().split("T")[0],
                projectID: values.projectDropdown ? values.projectDropdown : taskProjectID,
                taskID: values.taskDropdown ? values.taskDropdown : taskID,
              }).then(() => navi.pop())
            }
          />
        </ActionPanel>
      }
    >
      {!task ? (
        <Form.Dropdown id="projectDropdown" title="Project" value={selectedProjectID} onChange={setSelectedProjectID}>
          {projects.map((project, index) => (
            <Form.Dropdown.Item title={project.name} key={index} value={project.id!.toString()} />
          ))}
        </Form.Dropdown>
      ) : null}
      {!task ? (
        <Form.Dropdown id="taskDropdown" title="Task">
          {selectedProjectID !== "0"
            ? projects
                .filter((project) => project.id === parseInt(selectedProjectID!))[0]
                .tasks.map((task, index) => (
                  <Form.Dropdown.Item title={task.name} key={index} value={task.id!.toString()} />
                ))
            : null}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea
        id="description"
        title="Add Description"
        placeholder="Describe what you are doing"
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDescriptionError("The field shouldn't be empty!");
          } else {
            dropDescriptionErrorIfNeeded();
          }
        }}
      />
      <Form.DatePicker id="date" type={Form.DatePicker.Type.Date} title="Booking Date" defaultValue={new Date()} />
      <Form.TextField
        id="hours"
        onChange={(event) => {
          if (event.length == 0) {
            setStartTimer(true);
          } else {
            setStartTimer(false);
          }
        }}
        title="Hours Worked"
        placeholder="Leaving this field empty will start a timer"
      />
    </Form>
  );
};
