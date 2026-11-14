import { LaunchProps } from "@raycast/api";
import { DelegateForm, DelegateFormValues } from "./components/DelegateForm";

export default function DelegateTask(props: LaunchProps<{ draftValues: DelegateFormValues }>) {
  return <DelegateForm draftValues={props.draftValues} />;
}
