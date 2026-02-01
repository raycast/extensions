// src/projects/components/GlobalIdeWarning.tsx
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  openExtensionPreferences,
} from "@raycast/api";

interface GlobalIdeWarningProps {
  ideName: string;
}

export function GlobalIdeWarning({ ideName }: GlobalIdeWarningProps) {
  return (
    <List.Section title="Warning">
      <List.Item
        key="global-ide-warning"
        title="Default IDE Not Found"
        subtitle={ideName}
        icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
