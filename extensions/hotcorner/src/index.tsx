import { ActionPanel, List, showToast, Action, Toast, Detail, open } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Top Left"
        icon="TL.png"
        actions={
          <ActionPanel>
            <Action.Push title="Configure This Corner" target={<CornerSettings corner="TL" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Top Right"
        icon="TR.png"
        actions={
          <ActionPanel>
            <Action.Push title="Configure This Corner" target={<CornerSettings corner="TR" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Bottom Left"
        icon="BL.png"
        actions={
          <ActionPanel>
            <Action.Push title="Configure This Corner" target={<CornerSettings corner="BL" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Bottom Right"
        icon="BR.png"
        actions={
          <ActionPanel>
            <Action.Push title="Configure This Corner" target={<CornerSettings corner="BR" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Disable All Corners"
        icon="Disable.png"
        actions={
          <ActionPanel>
            <Action title="Disable All" onAction={disableAllHotcorners} />
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

interface CornerSettingsProps {
  corner: CornerType;
}

// 定义一个类型，用于限制 corner 的可能值
type CornerType = "TL" | "TR" | "BL" | "BR";

function CornerSettings({ corner }: CornerSettingsProps) {
  const readableCornerName = getReadableCornerName(corner);

  return (
    <List>
      <List.Section title={`${readableCornerName} Corner`}>
        <List.Item
          title="Disable"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 1)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Mission Control"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 2)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Application Windows"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 3)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Desktop"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 4)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Notification Center"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 12)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Launchpad"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 11)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Quick Note"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 14)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Start ScreenSaver"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 5)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Disable ScreenSaver"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 6)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Put Display to Sleep"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 10)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Lock Screen"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 13)} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// 将角落的缩写转换为完整的名称
function getReadableCornerName(corner: CornerType): string {
  const cornerNames: Record<CornerType, string> = {
    TL: "Top Left",
    TR: "Top Right",
    BL: "Bottom Left",
    BR: "Bottom Right",
  };

  return cornerNames[corner];
}

// 关闭某个触发角
function setCorner(corner: string, option: number) {
  const appleScriptCommand = `defaults write com.apple.dock wvous-${corner.toLowerCase()}-corner -int ${option} && killall Dock`;

  exec(appleScriptCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error(`执行出错: ${error.message}`);
      await showToast(Toast.Style.Failure, "Failed", error.message);
      return;
    }
    if (stderr) {
      console.error(`错误输出: ${stderr}`);
      await showToast(Toast.Style.Failure, "Error", stderr);
      return;
    }
    await showToast(Toast.Style.Success, "Done");
  });

  console.log(`Setting ${corner} with option ${option}`);
}

// 关闭全部触发角
function disableAllHotcorners() {
  const disableCommand =
    "defaults write com.apple.dock wvous-tl-corner -int 0 && " +
    "defaults write com.apple.dock wvous-tr-corner -int 0 && " +
    "defaults write com.apple.dock wvous-bl-corner -int 0 && " +
    "defaults write com.apple.dock wvous-br-corner -int 0 && " +
    "killall Dock";

  exec(disableCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error(`执行出错: ${error.message}`);
      await showToast(Toast.Style.Failure, "Failed", error.message);
      return;
    }
    if (stderr) {
      console.error(`错误输出: ${stderr}`);
      await showToast(Toast.Style.Failure, "Error");
      return;
    }
    await showToast(Toast.Style.Success, "All Hot Corners Disabled");
  });
}

// 新增帮助视图组件
function HelpView() {
  const markdownContent = `
# Help
## System requirements
HotCorner only works on macOS Sonama for now. 

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

//打开系统设置
function OpenSecurityPrivacyAction() {
  const handleOpenSecurityPrivacy = () => {
    // macOS URL 方案用于打开安全性与隐私设置
    open("x-apple.systempreferences:com.apple.preference.security");
  };

  handleOpenSecurityPrivacy();
}
