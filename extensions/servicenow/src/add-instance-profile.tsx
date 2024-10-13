import InstanceForm from "./components/InstanceForm";
import useInstances from "./hooks/useInstances";

export default function addInstanceProfile() {
  const { addInstance } = useInstances();

  return <InstanceForm onSubmit={addInstance} />;
}
