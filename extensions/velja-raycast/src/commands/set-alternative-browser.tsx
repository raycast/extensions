import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { getBrowserIcon, getBrowserSubtitle, getBrowserTitle, getSelectableBrowserIdentifiers } from "../lib/browsers";
import { setAlternativeBrowserViaShortcut } from "../lib/shortcuts";
import { DEFAULT_BROWSER_MARKER, readVeljaConfig } from "../lib/velja";

export default function Command() {
  const config = readVeljaConfig();
  const browserIdentifiers = getSelectableBrowserIdentifiers(config.preferredBrowsers, {
    includePrompt: true,
    promptFirst: true,
    extraIdentifiers:
      config.alternativeBrowser && config.alternativeBrowser !== DEFAULT_BROWSER_MARKER
        ? [config.alternativeBrowser]
        : [],
  });

  async function handleSetAlternative(identifier: string) {
    await showToast({ style: Toast.Style.Animated, title: "Updating alternative browser..." });

    try {
      setAlternativeBrowserViaShortcut(identifier);
      await showToast({ style: Toast.Style.Success, title: "Updated alternative browser" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update alternative browser",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List searchBarPlaceholder="Select Velja alternative browser...">
      {browserIdentifiers.map((identifier) => (
        <List.Item
          key={identifier}
          title={getBrowserTitle(identifier)}
          subtitle={getBrowserSubtitle(identifier)}
          icon={getBrowserIcon(identifier)}
          accessories={identifier === config.alternativeBrowser ? [{ tag: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Set as Alternative Browser"
                icon={Icon.CheckCircle}
                onAction={() => handleSetAlternative(identifier)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
