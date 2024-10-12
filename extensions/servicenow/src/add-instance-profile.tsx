import { LaunchProps } from "@raycast/api";
import InstanceForm from "./components/InstanceForm";
import useInstances from "./hooks/useInstances";

export default function quicklySearchSelectedInstance(props: LaunchProps) {
  const { addInstance } = useInstances();

  return <InstanceForm onSubmit={addInstance} />;
}
