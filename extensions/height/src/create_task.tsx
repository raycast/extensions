import CreateTask from "./components/CreateTask";
import { CreateTaskFormValues } from "./types/task";

export default function Command({ draftValues }: { draftValues?: CreateTaskFormValues }) {
  return <CreateTask draftValues={draftValues} />;
}
