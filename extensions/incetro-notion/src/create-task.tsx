import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Employee } from "./entities/employee";
import { HTTPRepository } from "./repositories/httpRepository";
import { StorageRepository } from "./repositories/storageRepository";
import { Project } from "./entities/project";
import { TaskPriority, NewTaskMsg } from "./entities/task";
import { isAxiosError } from "axios";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | undefined>();
  const [employee, setEmployee] = useState<Employee | undefined>();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [task, setTask] = useState<string>("");
  const [estimate, setEstimate] = useState<string>("0");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium);
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());

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
      <List.Section title="Projects">
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

  function createTask() {
    if (employee && project && task && estimate && priority && start && end) {
      const taskMsg = {
        projectID: project.id,
        executorID: employee.id,
        task: task,
        estimate: parseFloat(estimate),
        priority: priority,
        start: start,
        end: end,
      } as NewTaskMsg;
      HTTPRepository.CreateTask(taskMsg)
        .then(() => {
          showToast({
            style: Toast.Style.Success,
            title: "Task is created",
          });
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to create task: ${err.code}`,
            });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `Failed to create task: unknown error`,
            });
          }
        });
    }
  }

  function renderTaskForm() {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create Task" onSubmit={() => createTask()} />
          </ActionPanel>
        }
      >
        <Form.TextField id="task" title="Task" onChange={(value) => setTask(value)} />
        <Form.TextField id="estimate" title="Estimate" onChange={(value) => setEstimate(value)} />
        <Form.Dropdown id="priority" title="Priority" onChange={(value) => setPriority(value as TaskPriority)}>
          <Form.Dropdown.Item value={TaskPriority.Low} title="Low" />
          <Form.Dropdown.Item value={TaskPriority.Medium} title="Medium" />
          <Form.Dropdown.Item value={TaskPriority.High} title="High" />
          <Form.Dropdown.Item value={TaskPriority.Critical} title="Critical" />
        </Form.Dropdown>
        <Form.DatePicker id="start" title="Start" value={start} onChange={(value) => setStart(value)} />
        <Form.DatePicker id="end" title="End" value={end} onChange={(value) => setEnd(value)} />
      </Form>
    );
  }

  if (project) {
    return renderTaskForm();
  }
  return (
    <List onSearchTextChange={(value) => setInput(value)} searchText={input}>
      {renderProjectList(projects)}
    </List>
  );
}
