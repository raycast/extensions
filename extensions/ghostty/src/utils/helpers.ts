import { LaunchConfig, PaneConfig } from "./types";

function generatePaneScript(pane: PaneConfig, isFirst = true): string {
  let script = "";

  if (!isFirst) {
    script += `
    tell application "System Events"
      tell process "Ghostty"
        ${
          pane.split_direction === "vertical"
            ? 'keystroke "|" using {shift down, command down}'
            : 'keystroke "-" using {shift down, command down}'
        }
      end tell
    end tell
    `;
  }

  if (pane.cwd) {
    script += `
    tell application "System Events"
      tell process "Ghostty"
        keystroke "cd ${pane.cwd} && clear" & return
      end tell
    end tell
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
      `;
    }
  }

  if (pane.panes) {
    for (const [index, subPane] of pane.panes.entries()) {
      script += generatePaneScript(subPane, index === 0);
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
