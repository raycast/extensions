import { List, ActionPanel, Action, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
const execP = promisify(exec);
import { usePromise } from "@raycast/utils";
import {
  findYouTubeTabs,
  togglePlayPause,
  debugTogglePlayPause,
  focusTab,
  executeInYouTubeTab,
  BrowserType,
} from "./utils/browser-control";

export default function Command() {
  const { data: tabs, isLoading, revalidate } = usePromise(findYouTubeTabs);

  if (!tabs || tabs.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Music}
          title="No media playing"
          description="Open YouTube in your browser to see it here"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search playing media...">
      {tabs.map((tab, index) => (
        <List.Item
          key={`${tab.browser}-${index}`}
          title={tab.title}
          subtitle={tab.url}
          icon={getBrowserIcon(tab.browser)}
          accessories={[{ tag: tab.browser }, { icon: tab.isPlaying ? Icon.Play : Icon.Pause }]}
          actions={
            <ActionPanel>
              <Action
                title="Play/pause"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    const result = await togglePlayPause(tab.browser, tab.url);

                    if (result === "playing") {
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Playing",
                      });
                    } else if (result === "paused") {
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Paused",
                      });
                    } else if (result === "clicked") {
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Toggled",
                        message: "Play button clicked",
                      });
                    } else if (result === "failed-to-play") {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Video not ready",
                        message: "Play video in browser first, then use Stagehand",
                      });
                    } else if (result && result.startsWith("js-error")) {
                      // JavaScript failed, but keyboard fallback worked
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Toggled (via keyboard)",
                        message: "JavaScript failed, used keyboard shortcut",
                      });
                    } else {
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Toggled",
                        message: result || "Success",
                      });
                    }

                    await revalidate();
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to control media",
                    });
                  }
                }}
              />
              <Action
                title="Copy URL"
                icon={Icon.Link}
                onAction={async () => {
                  const cleanUrl = tab.url.split("&t=")[0].split("?t=")[0];
                  await Clipboard.copy(cleanUrl);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "URL copied",
                  });
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Copy URL at Current Time"
                icon={Icon.Clock}
                onAction={async () => {
                  try {
                    const jsCode = `
                      (function() {
                        const video = document.querySelector('video');
                        if (!video) return '0';
                        return Math.floor(video.currentTime).toString();
                      })();
                    `;

                    const currentTimeStr = await executeInYouTubeTab(tab.browser, jsCode, tab.url);
                    const currentTime = parseInt(currentTimeStr) || 0;

                    const baseUrl = tab.url.split("&t=")[0].split("?t=")[0];
                    const urlWithTimestamp = `${baseUrl}&t=${currentTime}s`;

                    await Clipboard.copy(urlWithTimestamp);

                    const minutes = Math.floor(currentTime / 60);
                    const seconds = currentTime % 60;
                    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

                    await showToast({
                      style: Toast.Style.Success,
                      title: "URL copied",
                      message: `at ${timeDisplay}`,
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to copy URL",
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Open Tab"
                icon={Icon.AppWindowSidebarLeft}
                onAction={async () => {
                  try {
                    await focusTab(tab.browser, tab.url);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Switched to tab",
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to open tab",
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
              <Action
                title="Copy Debug Logs"
                icon={Icon.Bug}
                onAction={async () => {
                  try {
                    const predicate = `process == "Raycast" AND (eventMessage CONTAINS "togglePlayPause Safari JS result" OR eventMessage CONTAINS "togglePlayPause Safari JS retry result" OR eventMessage CONTAINS "Executing JavaScript in Safari")`;
                    const cmd = `log show --style syslog --predicate '${predicate}' --last 5m`;

                    const { stdout } = await execP(cmd, {
                      maxBuffer: 10 * 1024 * 1024,
                    });

                    if (!stdout || stdout.trim() === "") {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "No debug logs found",
                      });
                      return;
                    }

                    await Clipboard.copy(stdout);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Debug logs copied",
                    });
                  } catch (error) {
                    console.error("Error copying debug logs:", error);
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to copy logs",
                    });
                  }
                }}
              />
              <Action
                title="Toggle (Debug & Copy)"
                icon={Icon.AppWindow}
                onAction={async () => {
                  try {
                    const trace = await debugTogglePlayPause(tab.browser, tab.url);
                    if (trace && trace.trim() !== "") {
                      await Clipboard.copy(trace);

                      // Also write trace to a temp file and open it so the output
                      // isn't lost if Raycast closes quickly.
                      try {
                        const home = process.env.HOME || ".";
                        const desktopPath = `${home}/Desktop/stagehand-safari-debug.txt`;
                        const { writeFile } = await import("fs/promises");
                        await writeFile(desktopPath, trace, {
                          encoding: "utf8",
                        });
                        // Open the Desktop file explicitly in TextEdit so it appears
                        await execP(`open -a TextEdit "${desktopPath}"`);

                        await showToast({
                          style: Toast.Style.Success,
                          title: "Debug trace saved",
                          message: `Saved to ${desktopPath}`,
                        });
                      } catch (fileErr) {
                        console.error("Failed to write/open debug trace file:", fileErr);
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to write debug file",
                        });
                      }
                    } else {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Empty debug trace",
                      });
                    }
                  } catch (error) {
                    console.error("Error running debug toggle:", error);
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Debug toggle failed",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getBrowserIcon(browser: BrowserType): Icon {
  switch (browser) {
    case "Google Chrome":
      return Icon.Globe;
    case "Arc":
      return Icon.AppWindow;
    case "Brave Browser":
      return Icon.Shield;
    case "Safari":
      return Icon.Compass;
    default:
      return Icon.Globe;
  }
}
