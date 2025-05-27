import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Employee } from "./entities/employee";
import { HTTPRepository } from "./repositories/httpRepository";
import { StorageRepository } from "./repositories/storageRepository";
import { Project } from "./entities/project";
import { Task } from "./entities/task";
import { isAxiosError } from "axios";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | undefined>();
  const [employee, setEmployee] = useState<Employee | undefined>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [task, setTask] = useState<Task>();

  const [whatDid, setWhatDid] = useState<string>("");
  const [hoursSpent, setHoursSpent] = useState<string>("");
  const [workDate, setWorkDate] = useState<Date>(new Date());

  useEffect(() => {
    StorageRepository.getEmployee().then((emp) => {
      if (emp) {
        setInput("");
        setEmployee(emp);
      } else {
        HTTPRepository.GetEmployees()
          .then((empList) => setEmployees(empList))
          .catch((err) => {
            if (isAxiosError(err)) {
              showToast({
                style: Toast.Style.Failure,
                title: `Failed to get employees: ${err.code}`,
              });
            } else {
              showToast({
                style: Toast.Style.Failure,
                title: `Failed to get employees: unknown error`,
              });
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    if (employee) {
      setInput("");
      HTTPRepository.GetProjects(employee)
        .then((projectList) => setProjects(projectList))
        .catch((err) => {
          if (isAxiosError(err)) {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to get projects: ${err.code}`,
            });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to get projects: unknown error`,
            });
          }
        });
    }
  }, [employee]);

  useEffect(() => {
    setInput("");
    if (employee && project)
      HTTPRepository.GetTasks(employee, project)
        .then((taskList) => setTasks(taskList))
        .catch((err) => {
          if (isAxiosError(err)) {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to get tasks: ${err.code}`,
            });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to get tasks: unknown error`,
            });
          }
        });
  }, [project]);

  function renderEmployeeList(empList: Employee[]) {
    return (
      <List onSearchTextChange={(value) => setInput(value)} searchText={input}>
        {empList
          .filter((emp) => emp.username.toLowerCase().includes(input))
          .map((emp) => (
            <List.Item
              key={emp.id}
              title={emp.username}
              actions={
                <ActionPanel>
                  {emp.id === employee?.id ? (
                    <Action
                      icon={Icon.Trash}
                      title="Unpick User"
                      onAction={() => StorageRepository.removeEmployee().then(() => setEmployee(undefined))}
                    />
                  ) : (
                    <Action
                      icon={Icon.Person}
                      title="Choose User"
                      onAction={() => StorageRepository.setEmployee(emp).then(() => setEmployee(emp))}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
      </List>
    );
  }

  if (!employee) {
    return renderEmployeeList(employees);
  }

  function renderProjectList(projList: Project[]) {
    return (
      <List.Section title="Сотрудники">
        {projList
          .filter((proj) => proj.name.toLowerCase().includes(input))
          .map((proj) => (
            <List.Item
              key={proj.id}
              title={proj.name}
              subtitle={proj.status}
              actions={
                <ActionPanel>
                  <Action icon={Icon.PlusCircle} title="Choose Project" onAction={() => setProject(proj)} />
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
              subtitle={task.status}
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
      HTTPRepository.WriteOfTime(employee, project, task, parseFloat(hoursSpent), whatDid, workDate)
        .then(() => {
          showToast({
            style: Toast.Style.Success,
            title: "Time is recorded",
          });
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to write of time: ${err.code}`,
            });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to write of time: unknown error`,
            });
          }
        });
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
        <Form.Description text={`Task: ${task?.title}, estimate ${task?.estimate} h.`} />
        <Form.TextField id="whatdid" title="What did?" onChange={(value) => setWhatDid(value)} />
        <Form.TextField id="hours" title="How many hours?" onChange={(value) => setHoursSpent(value)} />
        <Form.DatePicker id="workdate" title="Work date" value={workDate} onChange={(value) => setWorkDate(value)} />
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
