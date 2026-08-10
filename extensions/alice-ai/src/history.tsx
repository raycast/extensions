import { Detail, LaunchProps } from "@raycast/api";
import "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import HistoryList from "./views/HistoryList";
import HistoryView from "./views/HistoryView";

interface Arguments {
  id?: string;
}

export default function HistoryCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const ready = useActionsAreReady();

  if (!ready) {
    return <Detail />;
  }

  if (props.arguments.id !== undefined) {
    return <HistoryView id={props.arguments.id} />;
  }

  return <HistoryList />;
}
