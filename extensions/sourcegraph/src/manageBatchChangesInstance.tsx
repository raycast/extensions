import InstanceCommand from "./components/InstanceCommand";
import ManageBatchChanges from "./components/ManageBatchChangesCommand";

export default function ManageBatchChangesSelfHosted() {
  return <InstanceCommand Command={ManageBatchChanges} />;
}
