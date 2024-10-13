import { LaunchProps } from "@raycast/api";
import InstanceForm from "./components/InstanceForm";
import useInstances from "./hooks/useInstances";
import { Instance } from "./types";

export default function addInstanceProfile(props: LaunchProps<{ draftValues: Instance }>) {
  const { draftValues } = props;
  const { addInstance } = useInstances();

  return <InstanceForm onSubmit={addInstance} instance={draftValues} />;
}
