import CreateTaskForm from "./components/CreateTaskForm";
import withAsanaAuth from "./components/withAsanaAuth";

export type TaskFormValues = {
  workspace: string;
  description: string;
  projects: string[];
  name: string;
  assignee: string;
  due_date: Date | null;
  start_date: Date | null;
};

export default withAsanaAuth(CreateTaskForm);
