import { Action, Icon } from "@raycast/api";
import { PortalType } from "../types";
import CreatePortalForm from "./CreatePortalForm";

function CreatePortalAction(props: {
  defaultPortalName?: string;
  onCreate: (portalName: string, portalId: string, portalType: PortalType) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create New Portal"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreatePortalForm defaultPortalName={props.defaultPortalName} onCreate={props.onCreate} />}
    />
  );
}

export default CreatePortalAction;
