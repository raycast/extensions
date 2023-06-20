import { useEffect, useState } from "react";
import {
  Icon,
  Form,
  List,
  useNavigation,
  Action,
  ActionPanel,
  getPreferenceValues,
  Application,
  getApplications,
  open,
  LocalStorage,
  showToast,
  environment,
} from "@raycast/api";
import { iconMap, setStorage, getStorage, ExtensionPreferences, installExamples } from "./lib/utils";
import { StorageKey } from "./lib/constants";
import { getFavicon, useCachedState } from "@raycast/utils";
import { Pin, checkExpirations, deletePin, modifyPin, openPin, usePins } from "./lib/Pins";
import { Group, useGroups } from "./lib/Groups";
import * as os from "os";
import { useRecentApplications } from "./lib/LocalData";
import path from "path";

/**
 * The form view for editing a pin.
 * @param props.pin The pin to edit.
 * @param props.setPins The function to update the list of pins.
 * @returns A form view.
 */
const EditPinView = (props: { pin: Pin; setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const pin = props.pin;
  const setPins = props.setPins;
  const [url, setURL] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [applications, setApplications] = useCachedState<Application[]>("applications", []);
  const { groups } = useGroups();
  const { pop } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <Form
      isLoading={applications.length == 0}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values) =>
              await modifyPin(
                pin,
                values.nameField,
                values.urlField,
                values.iconField,
                values.groupField,
                values.openWithField,
                values.dateField,
                values.execInBackgroundField,
                pop,
                setPins
              )
            }
          />
          <Action
            title="Delete Pin"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              deletePin(pin, setPins);
              pop();
            }}
          />
          <PlaceholdersGuideAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use URL"
        defaultValue={pin.name}
      />

      <Form.TextArea
        id="urlField"
        title="Target"
        placeholder="Enter the filepath, URL, or Terminal command to pin"
        error={urlError}
        onChange={async (value) => {
          setURL(value);
          if (value.startsWith("~")) {
            value = value.replace("~", os.homedir());
          }

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

          if (urlError !== undefined) {
            setUrlError(undefined);
          } else {
            null;
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL cannot be empty!");
          } else if (urlError !== undefined) {
            setUrlError(undefined);
          }
        }}
        defaultValue={pin.url}
      />

      {!url?.startsWith("/") && !url?.startsWith("~") && !url?.match(/^[a-zA-Z0-9]*?:.*/g) ? (
        <Form.Checkbox
          label="Execute in Background"
          id="execInBackgroundField"
          defaultValue={pin.execInBackground}
          info="If checked, the pinned Terminal command will be executed in the background instead of in a new Terminal tab."
        />
      ) : null}

      <Form.Dropdown id="iconField" title="Icon" defaultValue={pin.icon}>
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
              icon={icon in iconMap ? iconMap[icon] : icon == "Favicon / File Icon" ? urlIcon : iconMap["Minus"]}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown
        title="Open With"
        id="openWithField"
        info="The application to open the pin with"
        defaultValue={pin.application}
      >
        <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
        {applications.map((app) => {
          return <Form.Dropdown.Item key={app.name} title={app.name} value={app.name} icon={{ fileIcon: app.path }} />;
        })}
      </Form.Dropdown>

      <Form.DatePicker
        id="dateField"
        title="Expiration Date"
        info="The date and time at which the pin will be automatically removed"
        type={Form.DatePicker.Type.DateTime}
        value={pin.expireDate == undefined ? undefined : new Date(pin.expireDate)}
        onChange={(value) => {
          if (value) {
            pin.expireDate = value.toUTCString();
          }
        }}
      />

      {groups.concat({ name: "None", icon: "Minus", id: -1 }).length > 0 ? (
        <Form.Dropdown id="groupField" title="Group" defaultValue={pin.group}>
          {[{ name: "None", icon: "Minus", id: -1 }].concat(groups).map((group) => {
            return (
              <Form.Dropdown.Item key={group.id} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
};

/**
 * Move a pin up in the list. If the pin is in a group, it will be moved up within the group. Otherwise, it will be moved up in the overall list of pins.
 * @param index The current index of the pin.
 * @param setPins The function to set the list of pins.
 */
const movePinUp = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  if (preferences.showGroups) {
    // Move pin up within its group
    const otherGroup = { name: "Other", icon: "Minus", id: -1 };
    const pinsSortedByGroup = storedGroups.concat(otherGroup).reduce((acc, current) => {
      const groupPins = storedPins.filter(
        (pin) => pin.group == current.name || (pin.group == "None" && current.name == "Other")
      );
      if (groupPins.length > index) {
        [groupPins[index - 1], groupPins[index]] = [groupPins[index], groupPins[index - 1]];
      }
      return [...acc, ...groupPins];
    }, [] as Pin[]);
    setPins(pinsSortedByGroup);
    await setStorage(StorageKey.LOCAL_PINS, pinsSortedByGroup);
  } else {
    // Move pin up in overall list
    if (storedPins.length > index) {
      [storedPins[index - 1], storedPins[index]] = [storedPins[index], storedPins[index - 1]];
      setPins(storedPins);
      await setStorage(StorageKey.LOCAL_PINS, storedPins);
    }
  }
};

/**
 * Moves a pin down in the list of pins. If the pin is in a group, it will be moved down within its group. Otherwise, it will be moved down in the overall list of pins.
 * @param index The current index of the pin.
 * @param setPins The function to set the list of pins.
 */
const movePinDown = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  if (preferences.showGroups) {
    // Move pin down within its group
    const otherGroup = { name: "Other", icon: "Minus", id: -1 };
    const pinsSortedByGroup = storedGroups.concat(otherGroup).reduce((acc, current) => {
      const groupPins = storedPins.filter(
        (pin) => pin.group == current.name || (pin.group == "None" && current.name == "Other")
      );
      if (groupPins.length > index + 1) {
        [groupPins[index], groupPins[index + 1]] = [groupPins[index + 1], groupPins[index]];
      }
      return [...acc, ...groupPins];
    }, [] as Pin[]);
    setPins(pinsSortedByGroup);
    await setStorage(StorageKey.LOCAL_PINS, pinsSortedByGroup);
  } else {
    // Move pin down in overall list
    if (storedPins.length > index + 1) {
      [storedPins[index], storedPins[index + 1]] = [storedPins[index + 1], storedPins[index]];
      setPins(storedPins);
      await setStorage(StorageKey.LOCAL_PINS, storedPins);
    }
  }
};

/**
 * Action to create a new pin. Opens the EditPinView with a blank pin.
 * @param props.setPins The function to set the pins state.
 * @returns An action component.
 */
const CreateNewPinAction = (props: { setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const { setPins } = props;
  return (
    <Action.Push
      title="Create New Pin"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={
        <EditPinView
          pin={{
            name: "",
            url: "",
            icon: "None",
            group: "None",
            id: -1,
            application: "None",
            expireDate: undefined,
            execInBackground: undefined,
          }}
          setPins={setPins}
        />
      }
    />
  );
};

/**
 * Action to install example pins. Only shows if examples are not installed and no pins have been created.
 * @param props.setExamplesInstalled The function to set the examples installed state.
 * @param props.revalidatePins The function to revalidate the pins.
 * @param props.revalidateGroups The function to revalidate the groups.
 * @returns An action component.
 */
const InstallExamplesAction = (props: {
  setExamplesInstalled: React.Dispatch<React.SetStateAction<LocalStorage.Value | undefined>>;
  revalidatePins: () => Promise<void>;
  revalidateGroups: () => Promise<void>;
}) => {
  const { setExamplesInstalled, revalidatePins, revalidateGroups } = props;
  return (
    <Action
      title="Install Example Pins"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={async () => {
        await installExamples();
        setExamplesInstalled(true);
        await revalidatePins();
        await revalidateGroups();
        await showToast({ title: "Examples Installed!" });
      }}
    />
  );
};

/**
 * Action to open the Placeholders Guide in the default markdown viewer (might be TextEdit).
 * @returns An action component.
 */
const PlaceholdersGuideAction = () => {
  return (
    <Action.Open
      title="Open Placeholders Guide"
      icon={Icon.Info}
      target={path.resolve(environment.assetsPath, "placeholders_guide.md")}
      shortcut={{ modifiers: ["cmd"], key: "g" }}
    />
  );
};

/**
 * Preferences for the View Pins command.
 */
interface CommandPreferences {
  /**
   * Whether to display groups as separate sections.
   */
  showGroups: boolean;

  /**
   * Whether to display subtitles for pins.
   */
  showSubtitles: boolean;
}

export default function Command() {
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const { recentApplications, loadingRecentApplications } = useRecentApplications();
  const [examplesInstalled, setExamplesInstalled] = useState<LocalStorage.Value | undefined>(true);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem(StorageKey.EXAMPLES_INSTALLED)).then((examplesInstalled) => {
      setExamplesInstalled(examplesInstalled);
    });
    Promise.resolve(checkExpirations());
  }, []);

  const getPinListItems = (pins: Pin[]) => {
    return pins.map((pin, index) => (
      <List.Item
        title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
        subtitle={preferences.showSubtitles ? pin.url.substring(0, 30) + (pin.url.length > 30 ? "..." : "") : undefined}
        keywords={[
          ...(pin.group == "None" ? "Other" : pin.group.split(" ")),
          ...pin.url
            .replaceAll(/([ /:.'"-])(.+?)(?=\b|[ /:.'"-])/gs, " $1 $1$2 $2")
            .split(" ")
            .filter((term) => term.trim().length > 0),
        ]}
        key={pin.id}
        icon={
          pin.icon in iconMap
            ? iconMap[pin.icon]
            : pin.icon == "None"
            ? Icon.Minus
            : pin.url.startsWith("/") || pin.url.startsWith("~")
            ? { fileIcon: pin.url }
            : pin.url.match(/^[a-zA-Z0-9]*?:.*/g)
            ? getFavicon(pin.url)
            : pin.icon.startsWith("/")
            ? { fileIcon: pin.icon }
            : Icon.Terminal
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Pin Actions">
              <Action title="Open" icon={Icon.ChevronRight} onAction={() => openPin(pin, preferences)} />

              <Action.CopyToClipboard
                title="Copy Pin Name"
                content={pin.name}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />

              <Action.CopyToClipboard
                title="Copy Pin URL"
                content={pin.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />

              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditPinView pin={pin} setPins={setPins} />}
              />
              <Action.Push
                title="Duplicate"
                icon={Icon.EyeDropper}
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "d" }}
                target={<EditPinView pin={{ ...pin, name: pin.name + " Copy", id: -1 }} setPins={setPins} />}
              />

              {index > 0 ? (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  onAction={async () => {
                    await movePinUp(index, setPins);
                  }}
                />
              ) : null}
              {index < pins.length - 1 ? (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={async () => {
                    await movePinDown(index, setPins);
                  }}
                />
              ) : null}

              <Action
                title="Delete Pin"
                icon={Icon.Trash}
                onAction={async () => {
                  await deletePin(pin, setPins);
                }}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                style={Action.Style.Destructive}
              />
            </ActionPanel.Section>
            <CreateNewPinAction setPins={setPins} />
            <PlaceholdersGuideAction />
          </ActionPanel>
        }
      />
    ));
  };

  return (
    <List
      isLoading={loadingPins || loadingGroups || loadingRecentApplications}
      searchBarPlaceholder="Search pins..."
      filtering={{ keepSectionOrder: true }}
      actions={
        <ActionPanel>
          <CreateNewPinAction setPins={setPins} />
          {!examplesInstalled && pins.length == 0 ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidatePins={revalidatePins}
              revalidateGroups={revalidateGroups}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Pins Yet!"
        description="Add a custom pin (⌘N)  or install some examples (⌘E)"
        icon="no-view.png"
      />
      {preferences.showGroups
        ? [{ name: "None", icon: "Minus", id: -1 }].concat(groups).map((group) => (
            <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
              {getPinListItems(pins.filter((pin) => pin.group == group.name))}
            </List.Section>
          ))
        : getPinListItems(pins)}
      {preferences.showRecentApplications && recentApplications.length > 1 ? (
        <List.Section title="Recent Applications">
          {recentApplications.slice(1).map((app) => (
            <List.Item
              title={app.name}
              subtitle="Recent Applications"
              key={app.name}
              icon={{ fileIcon: app.path }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Pin Actions">
                    <Action title="Open" icon={Icon.ChevronRight} onAction={() => open(app.path)} />
                  </ActionPanel.Section>
                  <CreateNewPinAction setPins={setPins} />
                  {!examplesInstalled && pins.length == 0 ? (
                    <InstallExamplesAction
                      setExamplesInstalled={setExamplesInstalled}
                      revalidatePins={revalidatePins}
                      revalidateGroups={revalidateGroups}
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
