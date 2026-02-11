import { List, ActionPanel, Action, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { findYouTubeTabs, togglePlayPause, focusTab, executeInYouTubeTab, BrowserType } from "./utils/browser-control";

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
                title="Play / Pause"
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
                    } else if (result === "failed-to-play") {
                      await showFailureToast(new Error("Play video in browser first, then use Stagehand"), {
                        title: "Video not ready",
                      });
                    } else {
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Toggled",
                      });
                    }

                    await revalidate();
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed to control media" });
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
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed to copy URL" });
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
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed to open tab" });
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
    case "Dia":
      return Icon.Stars;
    default:
      return Icon.Globe;
  }
}
