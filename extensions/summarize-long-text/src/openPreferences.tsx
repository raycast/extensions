import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

/**
 * OpenPreferences Component.
 *
 * This functional component serves as a view that is displayed when the extension is
 * unable to read the user's preferences. It reminds users to go to the extension preferences
 * to make the necessary changes.
 *
 * @param prefMessage - A message to be displayed, detailing what preferences need to be changed.
 *
 * @returns JSX.Element - A Detail component containing a markdown message and an action to open extension preferences.
 */
export const OpenPreferences: React.FC<{ prefMessage: string }> = ({ prefMessage }) => {
  // Prepare markdown content to display the preference message
  const markdown = `# Change preferences\n\n${prefMessage}\n\nHit enter to go to the extension preferences.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};
