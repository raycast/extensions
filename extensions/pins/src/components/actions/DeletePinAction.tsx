import { Action, Icon, Keyboard } from "@raycast/api";
import { Pin, deletePin } from "../../lib/Pins";

/**
 * Action to delete a pin.
 * @param props.pin The pin to delete.
 * @param props.setPins The function to update the list of pins.
 * @returns An action component.
 */
export default function DeletePinAction(props: {
  pin: Pin;
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
  pop?: () => void;
}) {
  const { pin, setPins, pop } = props;

  return (
    <Action
      title="Delete Pin"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        await deletePin(pin, setPins);
        pop?.();
      }}
    />
  );
}
