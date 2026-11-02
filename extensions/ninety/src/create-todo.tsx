import { LaunchProps } from "@raycast/api";
import { TodoForm, TodoFormValues } from "./components/TodoForm";

export default function Command(props: LaunchProps<{ draftValues: TodoFormValues }>) {
  return <TodoForm draftValues={props.draftValues} />;
}
