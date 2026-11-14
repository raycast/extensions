import { Detail } from "@raycast/api";
import SelectedTextAction from "../components/SelectedTextAction";
import { useActionsState } from "../store/actions";

interface Props {
  id: string;
}

export default function CommandExecute({ id }: Props) {
  const action = useActionsState((state) => state.actions.find((a) => a.id === id));

  if (!action) {
    return (
      <Detail
        markdown={`## ⚠️ Action Not Found\n\nWe're sorry, but the action with the ID \`${id}\` could not be found.`}
        navigationTitle="Action Not Found"
      />
    );
  }

  return <SelectedTextAction action={action} />;
}
