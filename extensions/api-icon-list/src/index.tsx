import { ActionPanel, Color, CopyToClipboardAction, Icon, List } from "@raycast/api";
import { useState } from 'react';

function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
  return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

export default function Command() {
  const [color, setColor] = useState<Color>();
  const actionPanelItems: Element[] = [];
  for (const colorName of enumKeys(Color)) {
    actionPanelItems.push(
      <ActionPanel.Item
        icon={{ source: Icon.Dot, tintColor: Color[colorName] }}
        title={colorName}
        key={colorName}
        onAction={() => setColor(Color[colorName])}
      />
    )
  }

  const items: Element[] = [];
  for (const iconName of enumKeys(Icon)) {
    items.push(
      <List.Item
        title={iconName}
        icon={{ source: Icon[iconName], tintColor: color }}
        id={iconName}
        key={iconName}
        actions={
          <ActionPanel>
            <CopyToClipboardAction title="Copy Icon Name" content={iconName} />
            <ActionPanel.Submenu icon={Icon.Dot} title="Change Color">
              {actionPanelItems}
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List searchBarPlaceholder="Filter icons by name...">
      {items}
    </List>
  );
}
