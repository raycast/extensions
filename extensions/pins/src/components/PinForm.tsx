import * as os from "os";
import path from "path";
import { useState } from "react";

import {
  Action,
  ActionPanel,
  Application,
  Color,
  environment,
  Form,
  getApplications,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { KEYBOARD_SHORTCUT } from "../lib/constants";
import { useGroups } from "../lib/Groups";
import { iconMap } from "../lib/icons";
import { createNewPin, getPins, getPinStatistics, modifyPin, Pin } from "../lib/Pins";
import { ExtensionPreferences } from "../lib/utils";
import CopyPinActionsSubmenu from "./actions/CopyPinActionsSubmenu";
import DeletePinAction from "./actions/DeletePinAction";

/**
 * Form for creating/editing a new pin.
 * @param props.pin The pin to edit.
 * @param props.setPins The function to call to update the list of pins.
 * @param props.pins The list of all pins.
 * @returns A form view component.
 */
export const PinForm = (props: { pin?: Pin; setPins?: React.Dispatch<React.SetStateAction<Pin[]>>; pins?: Pin[] }) => {
  const { pin, setPins, pins } = props;
  const [url, setURL] = useState<string | undefined>(pin ? pin.url : undefined);
  const [icon, setIcon] = useState<string | undefined>(pin ? pin.icon : undefined);
  const [iconColor, setIconColor] = useState<string | undefined>(pin ? pin.iconColor : undefined);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [shortcutError, setShortcutError] = useState<string | undefined>();
  const [isFragment, setIsFragment] = useState<boolean>(pin && pin.fragment ? true : false);
  const [applications, setApplications] = useState<Application[]>([]);
  const { groups } = useGroups();
  const { pop } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              const shortcut = { modifiers: values.modifiersField, key: values.keyField };

              if (values.modifiersField.length > 0) {
                // Check if the shortcut is reserved by the extension
                const reservedShortcut = Object.entries(KEYBOARD_SHORTCUT).find(
                  ([, reservedShortcut]) =>
                    shortcut.modifiers.every((modifier: Keyboard.KeyModifier) =>
                      reservedShortcut.modifiers.includes(modifier)
                    ) && reservedShortcut.key == shortcut.key
                );
                if (reservedShortcut) {
                  setShortcutError(`This shortcut is reserved by the extension! (${reservedShortcut[0]})`);
                  return false;
                }

                // Check if the shortcut is already in use by another pin
                const usedShortcut = pins?.find(
                  (pin) =>
                    pin.shortcut?.modifiers.every((modifier) => shortcut.modifiers.includes(modifier)) &&
                    pin.shortcut?.key == shortcut.key
                );
                if (usedShortcut && (!pin || usedShortcut.id != pin.id)) {
                  setShortcutError(`This shortcut is already in use by another pin! (${usedShortcut.name})`);
                  return false;
                }
              }

              if (pin && setPins) {
                await modifyPin(
                  pin,
                  values.nameField,
                  values.urlField,
                  values.iconField,
                  values.groupField,
                  values.openWithField,
                  values.dateField,
                  values.execInBackgroundField,
                  values.fragmentField,
                  values.modifiersField.length ? { modifiers: values.modifiersField, key: values.keyField } : undefined,
                  pin.lastOpened ? new Date(pin.lastOpened) : undefined,
                  pin.timesOpened,
                  pin.dateCreated ? new Date(pin.dateCreated) : new Date(),
                  values.iconColorField,
                  pin.averageExecutionTime,
                  pop,
                  setPins
                );
              } else {
                await createNewPin(
                  values.nameField || values.urlField.substring(0, 50),
                  values.urlField,
                  values.iconField,
                  values.groupField || "None",
                  values.openWithField,
                  values.dateField,
                  values.execInBackgroundField,
                  values.fragmentField,
                  { modifiers: values.modifiersField, key: values.keyField },
                  values.iconColorField
                );
                if (setPins) {
                  setPins(await getPins());
                }
                await showToast({ title: `Added pin for "${values.nameField}"` });
                pop();
              }
            }}
          />
          <Action.Open
            title="Open Placeholders Guide"
            icon={Icon.Info}
            target={path.resolve(environment.assetsPath, "placeholders_guide.md")}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          {pin && setPins ? <DeletePinAction pin={pin} setPins={setPins} pop={pop} /> : null}
          {pin && pins ? <CopyPinActionsSubmenu pin={pin} pins={pins} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use target"
        info="The name of the pin as it will appear in the list/menu. If left blank, the first 50 characters of the target (prior to placeholder substitution) will be used as the name."
        defaultValue={pin ? pin.name : undefined}
      />

      <Form.TextArea
        id="urlField"
        title="Target"
        placeholder="Filepath, URL, or Terminal command to pin"
        info="The target URL, path, script, or text of the pin. Placeholders can be used to insert dynamic values into the target. See the Placeholders Guide (⌘G) for more information."
        error={urlError}
        onChange={async (value) => {
          setURL(value);
          if (value.startsWith("~")) {
            value = value.replace("~", os.homedir());
          }

          try {
            setApplications(await getApplications(value));
          } catch (error) {
            const allApplications = await getApplications();
            if (value.match(/^[a-zA-Z0-9]*?:.*/g)) {
              const preferredBrowser = preferences.preferredBrowser ? preferences.preferredBrowser : "Safari";
              const browser = allApplications.find((app) => app.name == preferredBrowser);
              if (browser) {
                setApplications([browser, ...allApplications.filter((app) => app.name != preferredBrowser)]);
              }
            } else {
              setApplications(allApplications);
            }
          }

          if (urlError !== undefined) {
            setUrlError(undefined);
          } else {
            null;
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("Target cannot be empty!");
          } else if (urlError !== undefined) {
            setUrlError(undefined);
          }
        }}
        defaultValue={pin ? pin.url : undefined}
      />

      <Form.Checkbox
        label="Treat as Text Fragment"
        id="fragmentField"
        info="If checked, the target will be treated as a text fragment, regardless of its format. Text fragments are copied to the clipboard when the pin is opened."
        onChange={(value) => setIsFragment(value)}
        defaultValue={pin ? pin.fragment : false}
      />

      {!isFragment && !url?.startsWith("/") && !url?.startsWith("~") && !url?.match(/^[a-zA-Z0-9]*?:.*/g) ? (
        <Form.Checkbox
          label="Execute in Background"
          id="execInBackgroundField"
          defaultValue={pin ? pin.execInBackground : false}
          info="If checked, the pinned Terminal command will be executed in the background instead of in a new Terminal tab."
        />
      ) : null}

      <Form.Dropdown
        id="iconField"
        title="Icon"
        info="The icon to display next to the pin in the list/menu. Favicons and file icons are automatically fetched. When an icon other than Favicon / File Icon is selected, the icon color can be changed (a color field will appear below)."
        defaultValue={pin ? pin.icon : "Favicon / File Icon"}
        onChange={(value) => setIcon(value)}
      >
        {iconList.map((icon) => {
          const urlIcon = url
            ? url.startsWith("/") || url.startsWith("~")
              ? { fileIcon: url }
              : url.match(/^[a-zA-Z0-9]*?:.*/g)
              ? getFavicon(url)
              : Icon.Terminal
            : iconMap["Minus"];

          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={
                icon in iconMap
                  ? { source: iconMap[icon], tintColor: iconColor }
                  : icon == "Favicon / File Icon"
                  ? urlIcon
                  : iconMap["Minus"]
              }
            />
          );
        })}
      </Form.Dropdown>

      {!icon || ["Favicon / File Icon", "None"].includes(icon) ? null : (
        <Form.Dropdown
          id="iconColorField"
          title="Icon Color"
          info="The color of the Pin's icon when displayed in the list/menu."
          onChange={(value) => setIconColor(value)}
          defaultValue={pin?.iconColor ?? Color.PrimaryText}
        >
          {Object.entries(Color).map(([key, color]) => {
            return (
              <Form.Dropdown.Item
                key={key}
                title={key}
                value={color as string}
                icon={{ source: Icon.Circle, tintColor: color }}
              />
            );
          })}
        </Form.Dropdown>
      )}

      {!isFragment ? (
        <Form.Dropdown
          title="Open With"
          id="openWithField"
          info="The application to open the pin with"
          defaultValue={pin ? pin.application : undefined}
        >
          <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
          {applications.map((app) => {
            return (
              <Form.Dropdown.Item key={app.name} title={app.name} value={app.path} icon={{ fileIcon: app.path }} />
            );
          })}
        </Form.Dropdown>
      ) : null}

      <Form.DatePicker
        id="dateField"
        title="Expiration Date"
        info="The date and time at which the pin will be automatically removed"
        defaultValue={pin && pin.expireDate ? new Date(pin.expireDate) : undefined}
      />

      {groups?.length ? (
        <Form.Dropdown
          id="groupField"
          title="Group"
          defaultValue={pin ? pin.group : "None"}
          info="The group that this Pin is associated with in the 'View Pins' command and in the menu bar dropdown."
        >
          {[{ name: "None", icon: "Minus", id: -1 }].concat(groups).map((group) => {
            return (
              <Form.Dropdown.Item key={group.name} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}

      <Form.Separator />

      <Form.TagPicker
        id="modifiersField"
        title="Keyboard Shortcut Modifiers"
        info="The keyboard modifiers to use for the keyboard shortcut that opens the pin. The combination of modifiers and key must be unique."
        defaultValue={pin ? pin.shortcut?.modifiers : undefined}
        error={shortcutError}
        onChange={() => setShortcutError(undefined)}
      >
        <Form.TagPicker.Item key="cmd" title="Command" value="cmd" />
        <Form.TagPicker.Item key="shift" title="Shift" value="shift" />
        <Form.TagPicker.Item key="ctrl" title="Control" value="ctrl" />
        <Form.TagPicker.Item key="alt" title="Option" value="alt" />
      </Form.TagPicker>

      <Form.TextField
        id="keyField"
        title="Keyboard Shortcut Key"
        info="The keyboard key to use for the keyboard shortcut that opens the pin. The combination of modifiers and key must be unique."
        defaultValue={pin ? pin.shortcut?.key : undefined}
        error={shortcutError}
        onChange={() => setShortcutError(undefined)}
      />

      {pin?.id != undefined ? (
        <>
          <Form.Separator />
          <Form.Description title="Statistics" text={getPinStatistics(pin, pins || []) as string} />
        </>
      ) : null}
    </Form>
  );
};
