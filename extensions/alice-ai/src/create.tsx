import { Detail } from "@raycast/api";
import "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import CommandForm from "./views/CommandForm";

export default function CreateCommand() {
  const ready = useActionsAreReady();

  if (!ready) {
    return <Detail />;
  }

  return <CommandForm />;
}
