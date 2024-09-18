import { Detail, LaunchType, launchCommand } from "@raycast/api";
import "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import CommandForm from "./views/CommandForm";

export default function CreateCommand() {
  const ready = useActionsAreReady();
  const redirectToAction = () => {
    launchCommand({
      ownerOrAuthorName: "quiknull",
      extensionName: "alice-ai",
      name: "commands",
      type: LaunchType.UserInitiated,
    });
  };

  if (!ready) {
    return <Detail />;
  }

  return <CommandForm afterSubmit={redirectToAction} />;
}
