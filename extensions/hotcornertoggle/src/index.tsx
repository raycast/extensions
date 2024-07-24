import { ActionPanel, List, showToast, Action, Toast, Detail, open } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Enable Hot Corners"
        icon="hc.png"
        actions={
          <ActionPanel>
            <Action title="Enable Hot Corners" onAction={setHotCorners} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Disable Hot Corners"
        icon="Disable.png"
        actions={
          <ActionPanel>
            <Action title="Disable Hot Corners" onAction={disableAllHotcorners} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Help"
        icon="help.png"
        actions={
          <ActionPanel>
            <Action.Push title="Show Help" target={<HelpView />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function setHotCorners() {
  const commands = [
    "defaults write com.apple.dock wvous-tl-corner -int 3", // Top Left: Application Windows
    "defaults write com.apple.dock wvous-bl-corner -int 2", // Bottom Left: Mission Control
    "defaults write com.apple.dock wvous-br-corner -int 4", // Bottom Right: Desktop
    "killall Dock"
  ];

  const fullCommand = commands.join(" && ");

  exec(fullCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      await showToast(Toast.Style.Failure, "Failed", error.message);
      return;
    }
    if (stderr) {
      console.error(`Error output: ${stderr}`);
      await showToast(Toast.Style.Failure, "Error", stderr);
      return;
    }
    await showToast(Toast.Style.Success, "Hot Corners Set Successfully");
  });
}

function disableAllHotcorners() {
  const disableCommand =
    "defaults write com.apple.dock wvous-tl-corner -int 0 && " +
    "defaults write com.apple.dock wvous-tr-corner -int 0 && " +
    "defaults write com.apple.dock wvous-bl-corner -int 0 && " +
    "defaults write com.apple.dock wvous-br-corner -int 0 && " +
    "killall Dock";

  exec(disableCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      await showToast(Toast.Style.Failure, "Failed", error.message);
      return;
    }
    if (stderr) {
      console.error(`Error output: ${stderr}`);
      await showToast(Toast.Style.Failure, "Error");
      return;
    }
    await showToast(Toast.Style.Success, "All Hot Corners Disabled");
  });
}

function HelpView() {
  const markdownContent = `
# Help
## System requirements
HotCorner only works on macOS Sonoma for now. 

## If HotCorner doesn't work
HotCorner requires Automation permission enable for Raycast to function properly.
Here is how to enable:

**STEP1** Open Security & Privacy Panel in System Preference  
Hit ENTER now to open the System Preference panel or navigate manually to System Preferences -> Security & Privacy -> Privacy -> Automation.  
  
**STEP2** Enable the toggle for "System Events" under Raycast.
![System Preference](SystemPreference.png)

## Screen Blinking
Since restarting the "dock" process is required to apply changes, a brief screen blinking may occur. This is normal and poses no harm to your device.

## Contact for help
If you encounter any issues or have feature requests, please feel free to send an email to me at: makiclin@gmail.com
  `;

  return (
    <Detail
      markdown={markdownContent}
      actions={
        <ActionPanel>
          <Action title="Open System Preference" onAction={OpenSecurityPrivacyAction} />
        </ActionPanel>
      }
    />
  );
}

function OpenSecurityPrivacyAction() {
  const handleOpenSecurityPrivacy = () => {
    open("x-apple.systempreferences:com.apple.preference.security");
  };

  handleOpenSecurityPrivacy();
}