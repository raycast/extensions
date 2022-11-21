import CreateTaskForm from "./components/CreateTaskForm";
import withAsanaAuth from "./components/withAsanaAuth";

export type TaskFormValues = {
  team: string;
  workspace: string;
  description: string;
  projects: string[];
  name: string;
  assignee: string;
  due_date: Date | null;
};

export default function Command(props: { draftValues?: TaskFormValues }) {
  return withAsanaAuth(<CreateTaskForm draftValues={props.draftValues} />);
}
