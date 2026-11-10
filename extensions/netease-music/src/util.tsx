import { showHUD, showToast, Toast } from "@raycast/api";
import { execFile, ExecFileException } from "child_process";
import { promisify } from "util";

const executeFile = promisify(execFile);

const menuItems = {
  play: ["Play", "播放"],
  pause: ["Pause", "暂停"],
  next: ["Next", "下一个"],
  previous: ["Previous", "上一个"],
  like: ["Like", "喜欢歌曲"],
  dislike: ["Unlike", "取消喜欢"],
  togglePlay: ["Play", "播放", "Pause", "暂停"],
  lyrics: ["Toggle Lyrics", "打开/关闭歌词"],
  volumeUp: ["Increase Volume", "升高音量"],
  volumeDown: ["Decrease Volume", "降低音量"],
};

const commandTitles: Record<keyof typeof menuItems, string> = {
  play: "Play",
  pause: "Pause",
  next: "Next Track",
  previous: "Previous Track",
  like: "Like Track",
  dislike: "Dislike Track",
  togglePlay: "Toggle Play/Pause",
  lyrics: "Toggle Lyrics",
  volumeUp: "Volume Up",
  volumeDown: "Volume Down",
};

const controlScript = `
on run argv
  set commandName to item 1 of argv
  set itemNames to items 2 thru -1 of argv
  if application id "com.netease.163music" is not running then
    tell application id "com.netease.163music" to launch
  end if

  tell application "System Events"
    set controlsReady to false
    repeat 40 times
      set musicProcesses to application processes whose bundle identifier is "com.netease.163music"
      if (count of musicProcesses) > 0 then
        tell item 1 of musicProcesses
          if exists menu bar 1 then
            repeat with barItem in menu bar items of menu bar 1
              if exists menu 1 of barItem then
                set candidateMenu to menu 1 of barItem
                if (exists menu item "Play" of candidateMenu) or (exists menu item "Pause" of candidateMenu) or (exists menu item "播放" of candidateMenu) or (exists menu item "暂停" of candidateMenu) then
                  set controlMenu to candidateMenu
                  set controlsReady to true
                  exit repeat
                end if
              end if
            end repeat
          end if
        end tell
      end if
      if controlsReady then exit repeat
      delay 0.25
    end repeat

    if not controlsReady then error "NeteaseMusic's controls are not ready. Wait for the app to finish opening and try again." number -1712

    tell controlMenu
      repeat with itemTitle in itemNames
        if exists menu item (contents of itemTitle) then
          if not (enabled of menu item (contents of itemTitle)) then error "This control is unavailable. Select a track in NeteaseMusic and try again."
          click menu item (contents of itemTitle)
          return
        end if
      end repeat

      if commandName is "play" then
        if (exists menu item "Pause") or (exists menu item "暂停") then return
      else if commandName is "pause" then
        if (exists menu item "Play") or (exists menu item "播放") then return
      end if
    end tell
    error "This control is unavailable in NeteaseMusic. Check the app and try again."
  end tell
end run
`;

type MusicCommand = keyof typeof menuItems;

export async function controlMusic(command: MusicCommand | MusicCommand[]) {
  const commands: MusicCommand[] = Array.isArray(command) ? command : [command];
  try {
    // Startup and macOS permission prompts can take longer than the old controller's one-second limit.
    for (const action of commands) {
      await executeFile("/usr/bin/osascript", ["-e", controlScript, action, ...menuItems[action]], { timeout: 30000 });
    }
    await showHUD(`${commands.map((action) => commandTitles[action]).join(" & ")} command completed.`);
  } catch (error) {
    const executionError = error as ExecFileException & { stderr?: string };
    const message = executionError?.stderr?.trim() || (error instanceof Error ? error.message : String(error));
    let description = message;
    if (message.includes("-1743") || message.includes("-25211") || message.includes("1002")) {
      description =
        "Allow Raycast in System Settings > Privacy & Security > Accessibility and Automation, then try again.";
    } else if (error instanceof Error && (error as ExecFileException).killed) {
      description =
        "NeteaseMusic took too long to respond. Check the app and any macOS permission prompts, then try again.";
    }
    await showToast({ style: Toast.Style.Failure, title: "Could not control NeteaseMusic.", message: description });
  }
}
