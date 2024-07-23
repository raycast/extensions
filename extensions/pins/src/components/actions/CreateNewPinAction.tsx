import { Icon, Action, Keyboard } from "@raycast/api";
import { PinForm } from "../PinForm";
import { Pin } from "../../lib/Pins";

/**
 * Action to create a new pin. Opens the PinForm view with a blank pin.
 * @param props.setPins The function to set the pins state.
 * @returns An action component.
 */
export default function CreateNewPinAction(props: { setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) {
  const { setPins } = props;
  return (
    <Action.Push
      title="Create New Pin"
      icon={Icon.PlusCircle}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PinForm setPins={setPins} />}
    />
  );
}
