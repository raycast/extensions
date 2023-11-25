import CreateTask from "./components/CreateTask";
import { withHeightAuth } from "./components/withHeightAuth";
import { CreateTaskFormValues } from "./types/task";

export default function Command({ draftValues }: { draftValues?: CreateTaskFormValues }) {
  return withHeightAuth(<CreateTask draftValues={draftValues} />);
}
