import { exec } from "node:child_process";
import { Detail, launchCommand, LaunchType, closeMainWindow, popToRoot, List, Icon } from "@raycast/api";
import { ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  continueInterval,
  createInterval,
  getCurrentInterval,
  getNextIntervalExecutor,
  isPaused,
  pauseInterval,
  preferences,
  resetInterval,
  restartInterval,
} from "./lib/intervals";
import { FocusText, ShortBreakText, LongBreakText } from "./lib/constants";
import { GiphyResponse, Interval, Quote } from "./lib/types";
import { checkDNDExtensionInstall } from "./lib/doNotDisturb";

const createAction = (action: () => void) => () => {
  action();

  try {
    launchCommand({
      name: "pomodoro-menu-bar",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error(error);
  }

  popToRoot();
  closeMainWindow();
};

const ActionsList = () => {
  const currentInterval = getCurrentInterval();
  checkDNDExtensionInstall();

  return (
    <List navigationTitle="Control Pomodoro Timers">
      {currentInterval ? (
        <>
          {isPaused(currentInterval) ? (
            <List.Item
              title="Continue"
              icon={Icon.Play}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(continueInterval)} title={"Continue"} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="Pause"
              icon={Icon.Pause}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(pauseInterval)} title={"Pause"} />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title="Reset"
            icon={Icon.Stop}
            actions={
              <ActionPanel>
                <Action onAction={createAction(resetInterval)} title={"Reset"} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Restart Current"
            icon={Icon.Repeat}
            actions={
              <ActionPanel>
                <Action onAction={createAction(restartInterval)} title={"Restart Current"} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <>
          <List.Item
            title={`Focus`}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("focus"))} title={"Focus"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Short Break`}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("short-break"))} title={"Short Break"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Long Break`}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("long-break"))} title={"Long Break"} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
};

const handleQuote = (): string => {
  let quote = { content: "You did it!", author: "Unknown" };
  const { isLoading, data } = useFetch<Quote[]>("https://zenquotes.io/api/random", {
    keepPreviousData: true,
  });
  if (!isLoading && data?.length) {
    quote = {
      content: data[0].q,
      author: data[0].a,
    };
  }

  return `> ${quote.content} \n>\n> &dash; ${quote.author}`;
};

const EndOfInterval = () => {
  let markdownContent = "# Interval Completed \n\n";
  let usingGiphy = false;

  if (preferences.enableConfetti) {
    exec("open raycast://extensions/raycast/raycast/confetti", function (err) {
      if (err) {
        // handle error
        console.error(err);
        return;
      }
    });
  }

  if (preferences.sound) {
    exec(`afplay /System/Library/Sounds/${preferences.sound}.aiff -v 10 && $$`);
  }

  if (preferences.enableQuote) {
    markdownContent += handleQuote() + "\n\n";
  }

  if (preferences.enableImage) {
    if (preferences.giphyAPIKey) {
      const { isLoading, data } = useFetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${preferences.giphyAPIKey}&tag=${preferences.giphyTag}&rating=${preferences.giphyRating}`,
        {
          keepPreviousData: true,
        },
      );
      if (!isLoading && data) {
        const giphyResponse = data as GiphyResponse;
        markdownContent += `![${giphyResponse.data.title}](${giphyResponse.data.images.fixed_height.url})`;
        usingGiphy = true;
      } else if (isLoading) {
        ("You did it!");
      } else {
        markdownContent += `![${"You did it!"}](${preferences.completionImage})`;
      }
    } else {
      markdownContent += preferences.completionImage
        ? `![${"You did it!"}](${preferences.completionImage})`
        : "You did it!";
    }
  }

  if (usingGiphy) {
    markdownContent = `![powered by GIPHY](Poweredby_100px-White_VertLogo.png) \n\n` + markdownContent;
  }

  const executor = getNextIntervalExecutor();

  return (
    <Detail
      navigationTitle={`Interval completed`}
      markdown={markdownContent}
      actions={
        <ActionPanel title="Start Next Interval">
          <Action
            title={executor.title}
            onAction={createAction(executor.onStart)}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title={FocusText}
            onAction={createAction(() => createInterval("focus"))}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title={ShortBreakText}
            onAction={createAction(() => createInterval("short-break"))}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title={LongBreakText}
            onAction={createAction(() => createInterval("long-break"))}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
};

export default function Command(props: { launchContext?: { currentInterval?: Interval } }) {
  return props.launchContext?.currentInterval ? <EndOfInterval /> : <ActionsList />;
}
