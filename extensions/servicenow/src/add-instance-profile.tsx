import InstanceForm from "./components/InstanceForm";
import useInstances from "./hooks/useInstances";

export default function quicklySearchSelectedInstance() {
  const { addInstance } = useInstances();

  return <InstanceForm onSubmit={addInstance} />;
}
