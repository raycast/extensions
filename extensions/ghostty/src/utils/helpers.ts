import { LaunchConfig, PaneConfig } from "./types";

function generatePaneScript(pane: PaneConfig, isFirst = true): string {
  let script = "";

  if (!isFirst) {
    script += `
    tell application "System Events"
      tell process "Ghostty"
        keystroke "d" using ${pane.split_direction === "vertical" ? "{command down}" : "{shift down, command down}"}
      end tell
    end tell
    delay 0.5
    `;
  }

  if (pane.cwd) {
    script += `
    tell application "System Events"
      tell process "Ghostty"
        keystroke "cd ${pane.cwd.replace(/(["\\$])/g, "\\$1")}" & return
      end tell
    end tell
    delay 0.5
    tell application "System Events"
      tell process "Ghostty"
        keystroke "clear" & return
      end tell
    end tell
    delay 0.2
    `;
  }

  if (pane.commands) {
    for (const cmd of pane.commands) {
      script += `
      tell application "System Events"
        tell process "Ghostty"
          keystroke "${cmd.exec.replace(/"/g, '\\"')}" & return
        end tell
      end tell
      delay 0.3
      `;
    }
  }

  if (pane.panes && pane.panes.length > 0) {
    for (const [index, subPane] of pane.panes.entries()) {
      const subPaneWithSplit = { ...subPane, split_direction: pane.split_direction };
      script += generatePaneScript(subPaneWithSplit, index === 0);
    }
  }

  return script;
}

export function generateWindowScript(window: LaunchConfig["windows"][0]): string {
  let script = "";

  for (const [tabIndex, tab] of window.tabs.entries()) {
    if (tabIndex > 0) {
      script += `
      tell application "System Events"
        tell process "Ghostty"
          keystroke "t" using {command down}
        end tell
      end tell
      `;
    }

    script += generatePaneScript(tab.layout);
  }

  return script;
}
