import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Top Left"
        icon="TL.png"
        actions={
          <ActionPanel>
            <Action.Push title="Config This Corner" target={<CornerSettings corner="TL" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Top Right"
        icon="TR.png"
        actions={
          <ActionPanel>
            <Action.Push title="Config This Corner" target={<CornerSettings corner="TR" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Bottom Left"
        icon="BL.png"
        actions={
          <ActionPanel>
            <Action.Push title="Config This Corner" target={<CornerSettings corner="BL" />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Bottom Right"
        icon="BR.png"
        actions={
          <ActionPanel>
            <Action.Push title="Config This Corner" target={<CornerSettings corner="BR" />} />
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
              <Action title="Confirm" onAction={() => setCorner(corner, 0)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="ScreenSaver"
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
          title="App Expose"
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
          title="Launchpad"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 5)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Notification Center"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 6)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Sleep"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 7)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Lock"
          actions={
            <ActionPanel>
              <Action title="Confirm" onAction={() => setCorner(corner, 8)} />
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
