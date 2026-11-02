import { LaunchProps } from "@raycast/api";
import { RockForm, RockFormValues } from "./components/RockForm";

export default function Command(props: LaunchProps<{ draftValues: RockFormValues }>) {
  return <RockForm draftValues={props.draftValues} />;
}
