import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Employee } from "./entities/employee";
import { HTTPRepository } from "./repositories/httpRepository";
import { StorageRepository } from "./repositories/storageRepository";
import { Project } from "./entities/project";
import { Task } from "./entities/task";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | undefined>();
  const [employee, setEmployee] = useState<Employee | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [task, setTask] = useState<Task>();

  const [whatDid, setWhatDid] = useState<string>("");
  const [hoursSpent, setHoursSpent] = useState<string>("");

  useEffect(() => {
    StorageRepository.getEmployee().then((emp) => {
      if (emp) {
        setEmployee(emp);
        HTTPRepository.GetProjects(emp).then((projectList) => setProjects(projectList));
      } else {
        return;
      }
    });
  }, []);

  useEffect(() => {
    setInput("");
    if (employee && project) HTTPRepository.GetTasks(employee, project).then((taskList) => setTasks(taskList));
  }, [project]);

  function renderProjectList(projList: Project[]) {
    return (
      <List.Section title="Сотрудники">
        {projList
          .filter((proj) => proj.name.toLowerCase().includes(input))
          .map((proj) => (
            <List.Item
              key={proj.id}
              title={proj.name}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Person} title="Choose Project" onAction={() => setProject(proj)} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    );
  }

  function renderTaskList(taskList: Task[]) {
    return (
      <List.Section title="Задачи">
        {taskList
          .filter((task) => task.title.toLowerCase().includes(input))
          .map((task) => (
            <List.Item
              key={task.id}
              title={task.title}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Person} title="Choose Task" onAction={() => [setTask(task)]} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    );
  }

  const writeOfTime = () => {
    if (employee && project && task && whatDid && hoursSpent) {
      try {
        HTTPRepository.WriteOfTime(employee, project, task, parseFloat(hoursSpent), whatDid).then(() => {
          showToast({
            style: Toast.Style.Success,
            title: "Time is recorded",
          });
        });
      } catch (error) {
        console.log(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
        });
      }
    }
  };

  function renderWriteOfTimeForm() {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Write of Time" onSubmit={() => writeOfTime()} />
          </ActionPanel>
        }
      >
        <Form.TextField id="whatdid" title="What did?" onChange={(value) => setWhatDid(value)} />
        <Form.TextField id="hours" title="How many hours?" onChange={(value) => setHoursSpent(value)} />
      </Form>
    );
  }

  if (task) {
    return renderWriteOfTimeForm();
  }

  if (project) {
    return (
      <List onSearchTextChange={(value) => setInput(value)} searchText={input}>
        {renderTaskList(tasks)}
      </List>
    );
  }
  return (
    <List onSearchTextChange={(value) => setInput(value)} searchText={input}>
      {renderProjectList(projects)}
    </List>
  );
}
