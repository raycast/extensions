import { Action, Icon } from "@raycast/api";
import { CreateEventForm } from "./index";

function CreateEventAction(props: { onCreate: (eventName: string, eventData: string | null) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Event"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateEventForm onCreate={props.onCreate} />}
    />
  );
}

export default CreateEventAction;
