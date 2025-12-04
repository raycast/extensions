import { LaunchProps } from "@raycast/api";

import AddTextForm from "./components/AddTextForm";

export default function AddTextToNote(props: LaunchProps) {
  return <AddTextForm draftValues={props.draftValues} />;
}
