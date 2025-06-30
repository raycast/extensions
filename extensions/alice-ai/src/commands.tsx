import { Detail, LaunchProps } from "@raycast/api";
import "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import CommandExecute from "./views/CommandExecute";
import CommandList from "./views/CommandList";

interface Arguments {
  id?: string;
}

export default function ActionsCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const ready = useActionsAreReady();

  if (!ready) {
    return <Detail />;
  }

  if (props.arguments.id !== undefined) {
    return <CommandExecute id={props.arguments.id} />;
  }

  return <CommandList />;
}
