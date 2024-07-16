import { Detail } from "@raycast/api";
import ExecuteAction from "../components/ExecuteAction";
import { useSelectedText } from "../hooks";
import { useActionsState } from "../store/actions";

interface Props {
  id: string;
}

export default function CommandExecute({ id }: Props) {
  const action = useActionsState((state) => state.actions.find((a) => a.id === id));
  const selectedText = useSelectedText();

  if (!action) {
    return (
      <Detail
        markdown={`## ⚠️ Action Not Found\n\nWe're sorry, but the action with the ID \`${id}\` could not be found.`}
        navigationTitle="Action Not Found"
      />
    );
  }

  if (selectedText.success === undefined) {
    return <Detail isLoading={true} />;
  }

  if (selectedText.success === false) {
    return (
      <Detail
        markdown={`## ⚠️ No Text Selected\n\nWe're sorry, but it seems like no text has been selected. Please ensure that you highlight the desired text before attempting the action again.`}
        navigationTitle="No Text Selected"
      />
    );
  }

  return <ExecuteAction action={action} prompt={selectedText.text} />;
}
