import { Clipboard, LaunchType, MenuBarExtra, launchCommand, showToast } from "@raycast/api";
import { getPinIcon } from "../../lib/icons";
import { Pin, deletePin, disablePin, hidePin, openPin } from "../../lib/Pins";
import { ExtensionPreferences, PinsMenubarPreferences, RightClickAction } from "../../lib/preferences";
import { LocalDataObject } from "../../lib/LocalData";
import { bulkApply } from "placeholders-toolkit/dist/lib/apply";
import { PinsInfoPlaceholders } from "../../lib/placeholders";
import { useEffect, useState } from "react";

/**
 * A menu item for a pin.
 * @param props.pin The pin to display.
 * @param props.preferences The preferences for the extension.
 * @param props.relevant Whether or not the pin is relevant to the current context.
 * @param props.localData The local data object specifying the current context.
 * @param props.setPins The function to call to update the list of pins.
 * @returns A menu item component.
 */
export default function PinMenuItem(props: {
  pin: Pin;
  preferences: ExtensionPreferences & PinsMenubarPreferences;
  relevant: boolean;
  localData: LocalDataObject;
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
}) {
  const { pin, relevant, preferences, localData, setPins } = props;
  const [title, setTitle] = useState<string>(
    pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url),
  );

  useEffect(() => {
    (async () => {
      const newTitle = await bulkApply(title, { allPlaceholders: PinsInfoPlaceholders });
      setTitle(newTitle);
    })();
  }, []);

  return (
    <MenuBarExtra.Item
      key={pin.id}
      icon={getPinIcon(pin)}
      title={title}
      subtitle={relevant ? "  ✧" : ""}
      tooltip={pin.tooltip}
      shortcut={pin.shortcut}
      onAction={async (event) => {
        if (event.type == "left-click") {
          await openPin(pin, preferences, localData as unknown as { [key: string]: string });
        } else {
          // Handle right-click based on user's preferences
          switch (preferences.rightClickAction) {
            case RightClickAction.Open:
              await openPin(pin, preferences, localData as unknown as { [key: string]: string });
              break;
            case RightClickAction.Delete:
              await deletePin(pin, setPins);
              break;
            case RightClickAction.Copy:
              await Clipboard.copy(pin.url);
              await showToast({ title: "Copied to Clipboard" });
              break;
            case RightClickAction.Edit:
              launchCommand({ name: "view-pins", type: LaunchType.UserInitiated, context: { pinID: pin.id } });
              break;
            case RightClickAction.Hide:
              await hidePin(pin, setPins);
              break;
            case RightClickAction.Disable:
              await disablePin(pin, setPins);
              break;
          }
        }
      }}
      alternate={
        <MenuBarExtra.Item
          key={pin.id}
          icon={getPinIcon(pin)}
          title={`Edit '${pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}'`}
          tooltip={pin.tooltip}
          onAction={async () =>
            launchCommand({ name: "view-pins", type: LaunchType.UserInitiated, context: { pinID: pin.id } })
          }
        />
      }
    />
  );
}
