import FindNotebooksCommand from "./components/FindNotebooksCommand";
import InstanceCommand from "./components/InstanceCommand";

export default function FindNotebooksSelfHosted() {
  return <InstanceCommand Command={FindNotebooksCommand} />;
}
