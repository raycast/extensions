import { Detail } from "@raycast/api";
import "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import HistoryList from "./views/HistoryList";

export default function HistoryCommand() {
  const ready = useActionsAreReady();

  if (!ready) {
    return <Detail />;
  }

  return <HistoryList />;
}
