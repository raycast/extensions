import { TodoForm } from "./components/todo-form";

export default function AddTodoCommand() {
  // Render the form immediately. Sign-in (if ever needed) is handled lazily on
  // submit, not as a blocking gate.
  return <TodoForm />;
}
