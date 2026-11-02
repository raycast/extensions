import { Detail, LaunchProps } from "@raycast/api";
import "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import { ItemLaunchContext } from "./types";
import CommandExecute from "./views/CommandExecute";
import CommandList from "./views/CommandList";

export default function ActionsCommand(props: LaunchProps<{ arguments: ItemLaunchContext; launchContext: ItemLaunchContext }>) {
  const ready = useActionsAreReady();

  if (!ready) {
    return <Detail />;
  }

  const id = props.launchContext?.id ?? props.arguments?.id;
  if (id !== undefined) {
    return <CommandExecute id={id} />;
  }

  return <CommandList />;
}
