import { LaunchProps } from "@raycast/api";
import { MRCreateForm } from "./components/mr_create";

export default function CreateMRRoot(props: LaunchProps) {
  return <MRCreateForm draftValues={props.draftValues} />;
}
