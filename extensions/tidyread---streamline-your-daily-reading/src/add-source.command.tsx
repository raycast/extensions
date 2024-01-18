import { LaunchType, launchCommand } from "@raycast/api";
import SourceForm from "./components/SourceForm";

export default function CreateSourceForm() {
  return (
    <SourceForm
      onSuccess={async () => {
        // don't have to handle error here, because it will be handled in SourceForm
        await launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
      }}
    />
  );
}
