import { LaunchProps } from "@raycast/api";
import { IssueForm, IssueFormValues } from "./components/IssueForm";

export default function Command(props: LaunchProps<{ draftValues: IssueFormValues }>) {
  return <IssueForm draftValues={props.draftValues} />;
}
