import { LaunchProps } from "@raycast/api";
import ResumeEditor, { ResumeEditorValues } from "./components/ResumeEditor";

export default function Command({ draftValues }: LaunchProps<{ draftValues: ResumeEditorValues }>) {
  return <ResumeEditor enableDrafts draftValues={draftValues} />;
}
