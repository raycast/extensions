import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { MovedToDesktopView } from "../views/MovedToDesktopView";

// Raycast only toggles which spaces are searched. Manage Space and Add New Space are kept as
// entries so that users looking for the other space actions are guided to the Desktop app
// instead of finding them gone.
// Manage Space stays the primary (Enter) action, taking over from the former Open Space Detail,
// so Enter never changes anything. Enabling or disabling a space stays on its own shortcut.
export const SpaceItemActionPanel = (props: {
  spaceId: string;
  enabled: boolean;
  toggleSpace: (spaceId: string) => void;
}) => {
  const { spaceId, enabled, toggleSpace } = props;

  const toggleAction = (
    <Action
      title={enabled ? "Disable Space" : "Enable Space"}
      icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
      shortcut={{ modifiers: ["ctrl"], key: "d" }}
      onAction={() => toggleSpace(spaceId)}
    />
  );

  const manageSpaceAction = (
    <Action.Push
      title="Manage Space"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      target={
        <MovedToDesktopView
          title="Manage Space"
          lead="Space details, members, tags, invitation links and join policies are managed in the 1bookmark Desktop app, along with creating, leaving and deleting a space."
        />
      }
    />
  );

  const addNewSpaceAction = (
    <Action.Push
      title="Add New Space"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<MovedToDesktopView title="New Space" lead="Spaces are created in the 1bookmark Desktop app." />}
    />
  );

  return (
    <ActionPanel>
      {manageSpaceAction}
      {toggleAction}
      <ActionPanel.Section>{addNewSpaceAction}</ActionPanel.Section>
    </ActionPanel>
  );
};
