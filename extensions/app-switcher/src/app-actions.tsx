import { Action, ActionPanel, Icon, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { AppGridItem } from "./types";
import { addExcludedApp } from "./excluded-apps";

function escapeAS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function switchToWindow(item: AppGridItem) {
  const name = escapeAS(item.appName);
  if (item.hasWindows && item.windowIndex >= 0) {
    const winIdx = item.windowIndex + 1; // AppleScript is 1-based
    await runAppleScript(`
      tell application "System Events"
        tell process "${name}"
          set frontmost to true
          try
            set value of attribute "AXMinimized" of window ${winIdx} to false
          end try
          try
            perform action "AXRaise" of window ${winIdx}
          end try
        end tell
      end tell
      tell application "${name}" to activate
    `);
  } else {
    await runAppleScript(`
      tell application "${name}"
        activate
        reopen
      end tell
      delay 0.1
      tell application "System Events"
        tell process "${name}"
          if (count of windows) is 0 then
            keystroke "n" using command down
          end if
        end tell
      end tell
    `);
  }
}

async function closeWindow(item: AppGridItem) {
  const name = escapeAS(item.appName);
  const winIdx = item.windowIndex + 1;
  await runAppleScript(`
    tell application "System Events"
      tell process "${name}"
        try
          perform action "AXPress" of button 1 of window ${winIdx}
        on error
          set frontmost to true
          perform action "AXRaise" of window ${winIdx}
          delay 0.1
          keystroke "w" using command down
        end try
      end tell
    end tell
  `);
}

async function minimizeWindow(item: AppGridItem) {
  const name = escapeAS(item.appName);
  const winIdx = item.windowIndex + 1;
  await runAppleScript(`
    tell application "System Events"
      tell process "${name}"
        set value of attribute "AXMinimized" of window ${winIdx} to true
      end tell
    end tell
  `);
}

async function hideApp(item: AppGridItem) {
  const name = escapeAS(item.appName);
  await runAppleScript(`
    tell application "System Events"
      set visible of process "${name}" to false
    end tell
  `);
}

async function quitApp(item: AppGridItem) {
  const name = escapeAS(item.appName);
  await runAppleScript(`tell application "${name}" to quit`);
}

interface AppActionsProps {
  item: AppGridItem;
  revalidate: () => void;
}

export function AppActions({ item, revalidate }: AppActionsProps) {
  const handleAction = async (
    action: (item: AppGridItem) => Promise<void>,
    successMessage: string,
    shouldClose = false,
  ) => {
    try {
      await action(item);
      if (shouldClose) {
        await closeMainWindow();
        await popToRoot();
      } else {
        await showToast({ style: Toast.Style.Success, title: successMessage });
        revalidate();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Action failed",
        message: String(error),
      });
    }
  };

  return (
    <ActionPanel>
      <Action
        title="Switch to App"
        icon={Icon.ArrowRight}
        onAction={() => handleAction(switchToWindow, "Switched", true)}
      />
      {item.hasWindows && item.windowIndex >= 0 && (
        <>
          <Action
            title="Close Window"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => handleAction(closeWindow, "Window closed")}
          />
          {item.minimized ? (
            <Action
              title="Restore Window"
              icon={Icon.Maximize}
              shortcut={{ modifiers: ["ctrl"], key: "m" }}
              onAction={() => handleAction(switchToWindow, "Window restored", true)}
            />
          ) : (
            <Action
              title="Minimize Window"
              icon={Icon.Minimize}
              shortcut={{ modifiers: ["ctrl"], key: "m" }}
              onAction={() => handleAction(minimizeWindow, "Window minimized")}
            />
          )}
        </>
      )}
      <Action
        title="Hide App"
        icon={Icon.EyeDisabled}
        shortcut={{ modifiers: ["ctrl"], key: "h" }}
        onAction={() => handleAction(hideApp, "App hidden")}
      />
      <Action
        title="Quit App"
        icon={Icon.Power}
        shortcut={{ modifiers: ["ctrl"], key: "q" }}
        onAction={() => handleAction(quitApp, "App quit")}
      />
      <Action
        title="Exclude App"
        icon={Icon.ExclamationMark}
        shortcut={{ modifiers: ["ctrl"], key: "e" }}
        onAction={async () => {
          await addExcludedApp(item.bundleId);
          await showToast({
            style: Toast.Style.Success,
            title: `${item.appName} excluded`,
          });
          revalidate();
        }}
      />
    </ActionPanel>
  );
}
