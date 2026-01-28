import { Action, ActionPanel, MenuBarExtra } from "@raycast/api";

import { ActionMap } from "../../config/actionMap";
import { AllowedActionKeys } from "../../types/types";

interface CustomActionsInterface {
  onClick: () => void;
  actionKey: AllowedActionKeys;
  wrapInSection?: boolean;
  menuBarItem?: boolean;
}

const CustomAction = ({ actionKey, onClick, wrapInSection, menuBarItem }: CustomActionsInterface) => {
  const { shortcut, getTitle, icon, color } = ActionMap[actionKey];

  if (menuBarItem) {
    const menubarItem = (
      <MenuBarExtra.Item title={getTitle()} shortcut={shortcut} icon={icon} onAction={() => onClick()} />
    );

    return wrapInSection ? <MenuBarExtra.Section>{menubarItem}</MenuBarExtra.Section> : menubarItem;
  }

  const actionComponent = (
    <Action shortcut={shortcut} title={getTitle()} icon={{ source: icon, tintColor: color }} onAction={onClick} />
  );

  return wrapInSection ? <ActionPanel.Section>{actionComponent}</ActionPanel.Section> : actionComponent;
};

export default CustomAction;
