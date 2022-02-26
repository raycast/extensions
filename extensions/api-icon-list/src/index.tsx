import { ActionPanel, ActionPanelSection, Color, CopyToClipboardAction, Icon, List } from "@raycast/api";
import { useState } from "react";

function enumKeys<O extends Record<string, unknown>, K extends keyof O = keyof O>(obj: O): K[] {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
}

export default function Command() {
  const [color, setColor] = useState<keyof typeof Color>("SecondaryText");
  const actionPanelItems: Element[] = [];
  for (const colorName of enumKeys(Color)) {
    actionPanelItems.push(
      <ActionPanel.Item
        icon={{ source: Icon.Dot, tintColor: Color[colorName] }}
        title={colorName}
        key={colorName}
        onAction={() => setColor(colorName)}
      />
    );
  }
  const items: Element[] = [];
  for (const iconName of enumKeys(Icon)) {
    items.push(
      <List.Item
        title={iconName}
        icon={{ source: Icon[iconName], tintColor: Color[color] }}
        id={iconName}
        key={iconName}
        actions={
          <ActionPanel>
            <ActionPanelSection title="Copy">
              <CopyToClipboardAction title="Copy Icon Name" content={iconName} />
              {color && (
                <CopyToClipboardAction
                  title="Copy JSON for Colored Icon"
                  content={`{ source: Icon.${iconName}, tintColor: Color.${color}}`}
                />
              )}
            </ActionPanelSection>
            <ActionPanelSection title="Color">
              <ActionPanel.Submenu icon={Icon.Dot} title="Change Color">
                {actionPanelItems}
              </ActionPanel.Submenu>
            </ActionPanelSection>
          </ActionPanel>
        }
      />
    );
  }

  return <List searchBarPlaceholder="Filter icons by name...">{items}</List>;
}
