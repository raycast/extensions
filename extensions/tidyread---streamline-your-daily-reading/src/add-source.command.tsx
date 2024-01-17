import { LaunchType, launchCommand } from "@raycast/api";
import SourceForm from "./components/SourceForm";

export default function CreateSourceForm() {
  return (
    <SourceForm
      onSuccess={() => {
        launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
      }}
    />
  );
}
