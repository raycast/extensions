import { Action, ActionPanel, useNavigation, Icon } from "@raycast/api";
import { RunAction } from "../views/runAction";
import { refreshSelectedFiles } from "../utils/fs";
import { fileManager } from "../managers/fileManager";

export function ActionMenu() {
  const { push } = useNavigation();
  const $displayConfig = (
    <ActionPanel.Submenu title="Display Setting" icon={Icon.WrenchScrewdriver}>
      <ActionPanel.Section title="Files">
        <Action
          title="All Files"
          icon={Icon.BulletPoints}
          onAction={() => {
            refreshSelectedFiles({ filterFileType: false });
          }}
        />
        <Action
          title="Only Supported Files"
          icon={Icon.Filter}
          onAction={() => {
            refreshSelectedFiles({ filterFileType: true });
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Preview Image">
        <Action title="Show" icon={Icon.Image} onAction={fileManager.config.previewImage.show} />
        <Action title="Hide" icon={Icon.Minus} onAction={fileManager.config.previewImage.hide} />
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
  return (
    <ActionPanel>
      <ActionPanel.Section title="Actions">
        <Action
          title="Run FFmpeg Action"
          icon={Icon.Uppercase}
          onAction={() => {
            push(<RunAction />);
          }}
        />
        {$displayConfig}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
