import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";

import { useEffect, useState } from "react";

import { Space, CreatOrUpdateSpaceOptions, SpaceFormValues } from "./types";
import * as utils from "./utils";

const ConfigureSpace = (props: { space: Space; onSpaceConfigured: (space: Space) => void }) => {
  const [keyCodeError, setKeyCodeError] = useState<string | undefined>();

  const validateSpace = async (spaceFormValues: SpaceFormValues, space: Space) => {
    const { keyCode } = spaceFormValues;

    if (!keyCode.length) {
      setKeyCodeError("KeyCode required");
      return;
    }

    const modifiers = Object.keys(spaceFormValues).filter(
      (value) => !!value.match(/down/gi) && spaceFormValues[value] === true
    );

    if (!modifiers.length) {
      showToast({
        title: "NameSpaces",
        message: "Modifier(s) required",
        style: Toast.Style.Failure,
      });

      return;
    }

    // emit
    props.onSpaceConfigured({
      ...space,
      name: spaceFormValues.name,
      keyCode: spaceFormValues.keyCode,
      modifiers,
      color: spaceFormValues.color,
      icon: spaceFormValues.icon,
      confetti: spaceFormValues.confetti,
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Space"
            icon={Icon.SaveDocument}
            onSubmit={(spaceFormValues: SpaceFormValues) => validateSpace(spaceFormValues, props.space)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={props.space.name} />
      <Form.Separator />
      <Form.Description text="Navigate to Keyboard Shortcuts => Mission Control to see/configure the current shortcut keys assigned to your Spaces." />
      <Form.TextField
        id="keyCode"
        title="KeyCode"
        defaultValue={props.space.keyCode}
        error={keyCodeError}
        onChange={(value) => {
          if (value?.length == 0) {
            setKeyCodeError("KeyCode required");
          } else {
            setKeyCodeError(undefined);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setKeyCodeError("KeyCode required");
          } else {
            setKeyCodeError(undefined);
          }
        }}
        info={"This is the macOS system 'KeyCode'. E.g. 18 for numerical key 1."}
      />
      <Form.Description title="" text="Modifiers: Select the modifier keys associated with this Space's shortcut." />
      <Form.Checkbox id="shift down" label="Shift (⇧)" defaultValue={props.space.modifiers.includes("shift down")} />
      <Form.Checkbox
        id="control down"
        label="Control (⌃)"
        defaultValue={props.space.modifiers.includes("control down")}
      />
      <Form.Checkbox id="option down" label="Option (⌥)" defaultValue={props.space.modifiers.includes("option down")} />
      <Form.Checkbox
        id="command down"
        label="Command (⌘)"
        defaultValue={props.space.modifiers.includes("command down")}
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={props.space.icon}>
        {Object.keys(utils.iconMap).map((icon) => {
          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={{ source: utils.iconMap[icon], tintColor: { light: "#000", dark: "#fff" } }}
            />
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown id="color" title="Color" defaultValue={props.space.color}>
        {Object.keys(utils.colors).map((color) => (
          <Form.Dropdown.Item
            key={color}
            title={color}
            value={utils.colors[color]}
            icon={{ source: Icon.CircleFilled, tintColor: utils.colors[color] }}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="confetti" label="Enable Confetti" defaultValue={props.space.confetti} />
    </Form>
  );
};

export default function Command() {
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);

  const [spaces, setSpaces] = useState<Space[]>([]);

  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      const { spaces } = await utils.namespacesPreferences.load();

      const hasValidPreferences = spaces && spaces.length;

      if (hasValidPreferences) {
        setSpaces(spaces);
      }

      // next tick
      setTimeout(() => {
        setHasCheckedPreferences(true);
      }, 0);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await utils.namespacesPreferences.save({ spaces });
    })();
  }, [spaces]);

  const switchToSpace = async (space: Space) => {
    if (!space.configured) {
      showToast({
        title: "NameSpaces",
        message: "Press ⌘+⮐ To Configure Space",
        style: Toast.Style.Failure,
      });

      return;
    }

    await utils.switchToSpace(space);

    await popToRoot({ clearSearchBar: true });
    space.confetti && (await utils.confetti());
    await closeMainWindow({ clearRootSearch: true });
  };

  const createOrUpdateConfiguredSpace = (space: Space, opts?: CreatOrUpdateSpaceOptions) => {
    if (opts?.create) {
      setSpaces((spaces) => [...spaces, { ...space, configured: true }]);
    } else {
      const updateSpaces = spaces.map<Space>((existingSpace) => {
        return existingSpace.id === space.id ? { ...space, configured: true } : existingSpace;
      });

      setSpaces(updateSpaces);
    }

    pop();
  };

  const maybeDeleteSpace = async (space: Space) => {
    confirmAlert({
      title: "Delete Space?",
      message: "Once you delete this Space, it cannot be undone",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction() {
          setSpaces(spaces.filter((existingSpace) => existingSpace.id !== space.id));

          showToast({
            title: "NameSpaces",
            message: "Space Deleted",
            style: Toast.Style.Success,
          });
        },
      },
    });
  };

  const CreateSpaceAction = () => {
    return (
      <Action.Push
        title="Create Space"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={
          <ConfigureSpace
            space={utils.generateConfigurableSpace()}
            onSpaceConfigured={(space) => createOrUpdateConfiguredSpace(space, { create: true })}
          />
        }
      />
    );
  };

  return !hasCheckedPreferences ? (
    <Form></Form>
  ) : (
    <List searchBarPlaceholder="Search Spaces..." actions={<ActionPanel>{CreateSpaceAction()}</ActionPanel>}>
      {spaces.map((space) => (
        <List.Item
          key={space.id}
          title={space.name}
          accessories={[
            space.confetti ? { text: "🎉" } : { text: null },
            {
              text: `${space.modifiers
                .map((modifier) => {
                  return utils.modifierMap[modifier];
                })
                .join("")} + KeyCode: ${space.keyCode}`,
            },
          ]}
          icon={{ source: utils.iconMap[space.icon], tintColor: space.color }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="NameSpaces">
                <Action title="Switch To Space" icon={Icon.Switch} onAction={() => switchToSpace(space)} />
                <Action.Push
                  title="Configure Space"
                  icon={Icon.Cog}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  target={
                    <ConfigureSpace space={space} onSpaceConfigured={(space) => createOrUpdateConfiguredSpace(space)} />
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {CreateSpaceAction()}
                <Action
                  title="Delete Space"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => maybeDeleteSpace(space)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No Spaces Configured" />
    </List>
  );
}
