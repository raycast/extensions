import { LaunchProps } from "@raycast/api";
import { HeadlineForm, HeadlineFormValues } from "./components/HeadlineForm";

export default function Command(props: LaunchProps<{ draftValues: HeadlineFormValues }>) {
  return <HeadlineForm isRoot draftValues={props.draftValues} />;
}
