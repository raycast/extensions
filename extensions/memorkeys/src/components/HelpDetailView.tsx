import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import UploadConfig from "./upload-config";

interface HelpDetailViewProps {
  configPath: string; // Path where config files are stored
}

// Component that displays setup instructions and help information
export const HelpDetailView = ({ configPath }: HelpDetailViewProps) => {
  // Markdown content with setup instructions
  const markdown = `
# Welcome to Memorkeys

*To help you remember the keys you forgot*

## Getting Started

Follow these simple steps to set up your shortcuts:

1. Open Raycast Settings ( ⌘ + , )
2. Navigate to Advanced tab and find 'Import/Export'  
3. Select 'Export Data' and choose only 'Settings'
4. Skip password creation* and save .rayconfig file
5. Use Upload Config ( ⌘ + U ) to process

---

### Your config files will be saved to:
\`${configPath}\`

---
*Note: The password step must be skipped. Password protection is required when exporting more than the Settings section.*
`;

  // Render help view with actions for configuration
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Help"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Help">
            <Action.Push
              title="Open Upload Config"
              target={<UploadConfig />}
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action.ShowInFinder
              title="Open Configs Directory"
              path={configPath}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
