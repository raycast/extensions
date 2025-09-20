import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";

import { Space, CreatOrUpdateSpaceOptions, SpaceFormValues } from "./types";
import * as utils from "./utils";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";

const ConfigureSpace = (props: { space: Space; onSpaceConfigured: (space: Space) => void }) => {
  const { itemProps, handleSubmit } = useForm<SpaceFormValues>({
    onSubmit(spaceFormValues) {
      // emit
      props.onSpaceConfigured({
        ...props.space,
        name: spaceFormValues.name,
        keyCode: spaceFormValues.keyCode,
        modifiers: spaceFormValues.modifiers,
        color: spaceFormValues.color,
        icon: spaceFormValues.icon,
        confetti: spaceFormValues.confetti,
      });
    },
    initialValues: props.space,
    validation: {
      keyCode: FormValidation.Required,
      modifiers: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Space" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="My New Space" {...itemProps.name} />
      <Form.Separator />
      <Form.Description text="Navigate to Keyboard Shortcuts => Mission Control to see/configure the current shortcut keys assigned to your Spaces." />
      <Form.TextField
        title="KeyCode"
        placeholder="18"
        info={"This is the macOS system 'KeyCode'. E.g. 18 for numerical key 1."}
        {...itemProps.keyCode}
      />
      <Form.TagPicker
        title="Modifiers"
        placeholder="Command (⌘)"
        info="Select the modifier keys associated with this Space's shortcut."
        {...itemProps.modifiers}
      >
        <Form.TagPicker.Item title="Shift (⇧)" value="shift down" />
        <Form.TagPicker.Item title="Control (⌃)" value="control down" />
        <Form.TagPicker.Item title="Option (⌥)" value="option down" />
        <Form.TagPicker.Item title="Command (⌘)" value="command down" />
      </Form.TagPicker>
      <Form.Dropdown title="Icon" {...itemProps.icon}>
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
      <Form.Dropdown title="Color" {...itemProps.color}>
        {Object.keys(utils.colors).map((color) => (
          <Form.Dropdown.Item
            key={color}
            title={color}
            value={utils.colors[color]}
            icon={{ source: Icon.CircleFilled, tintColor: utils.colors[color] }}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox label="Enable Confetti" {...itemProps.confetti} />
    </Form>
  );
};

export default function Command() {
  const { isLoading, value = { spaces: [] }, setValue } = useLocalStorage<{ spaces: Space[] }>("namespaces");

  const { pop } = useNavigation();

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
      setValue({ spaces: [...value.spaces, { ...space, configured: true }] });
    } else {
      const updateSpaces = value.spaces.map<Space>((existingSpace) => {
        return existingSpace.id === space.id ? { ...space, configured: true } : existingSpace;
      });

      setValue({ spaces: updateSpaces });
    }

    pop();
  };

  const maybeDeleteSpace = async (space: Space) => {
    confirmAlert({
      title: "Delete Space?",
      message: "Once you delete this Space, it cannot be undone",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction() {
          setValue({ spaces: value.spaces.filter((existingSpace) => existingSpace.id !== space.id) });

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
        shortcut={Keyboard.Shortcut.Common.New}
        target={
          <ConfigureSpace
            space={utils.generateConfigurableSpace()}
            onSpaceConfigured={(space) => createOrUpdateConfiguredSpace(space, { create: true })}
          />
        }
      />
    );
  };

  const moveSpace = async (index: number, direction: "up" | "down") => {
    const from = index;
    const to = direction === "up" ? index - 1 : index + 1;
    const updatedSpaces = value.spaces;
    [updatedSpaces[from], updatedSpaces[to]] = [updatedSpaces[to], updatedSpaces[from]];
    setValue({ spaces: updatedSpaces });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Spaces..."
      actions={<ActionPanel>{CreateSpaceAction()}</ActionPanel>}
    >
      {value.spaces.map((space, spaceIndex) => (
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
                <Action title="Switch to Space" icon={Icon.Switch} onAction={() => switchToSpace(space)} />
                <Action.Push
                  title="Configure Space"
                  icon={Icon.Cog}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  target={
                    <ConfigureSpace space={space} onSpaceConfigured={(space) => createOrUpdateConfiguredSpace(space)} />
                  }
                />
                {value.spaces.length > 1 && (
                  <>
                    {spaceIndex !== 0 && (
                      <Action
                        icon={Icon.ArrowUp}
                        title="Move Space Up"
                        shortcut={Keyboard.Shortcut.Common.MoveUp}
                        onAction={() => moveSpace(spaceIndex, "up")}
                      />
                    )}
                    {spaceIndex !== value.spaces.length - 1 && (
                      <Action
                        icon={Icon.ArrowDown}
                        title="Move Space Down"
                        shortcut={Keyboard.Shortcut.Common.MoveDown}
                        onAction={() => moveSpace(spaceIndex, "down")}
                      />
                    )}
                  </>
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                {CreateSpaceAction()}
                <Action
                  title="Delete Space"
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
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
