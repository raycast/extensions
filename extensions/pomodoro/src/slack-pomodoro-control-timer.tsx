import { Detail, launchCommand, LaunchType, closeMainWindow, popToRoot, List, Icon } from "@raycast/api";
import { ActionPanel, Action } from "@raycast/api";
import { OAuthService, getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { exec } from "child_process";
import { getCurrentInterval, isPaused, preferences } from "./lib/intervals";
import { FocusText, ShortBreakText, LongBreakText } from "./lib/constants";
import { GiphyResponse, Interval } from "./lib/types";
import {
  getNextSlackIntervalExecutor,
  slackContinueInterval,
  slackCreateInterval,
  slackPauseInterval,
  slackResetInterval,
  slackRestartInterval,
} from "./lib/slack/slackIntervals";

const createAction = (action: () => Promise<void> | Promise<Interval | undefined>) => async () => {
  await action();

  try {
    launchCommand({
      name: "slack-pomodoro-menu-bar",
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
  const { token } = getAccessToken();
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
                  <Action onAction={createAction(async () => slackContinueInterval(token))} title={"Continue"} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="Pause"
              icon={Icon.Pause}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(async () => slackPauseInterval(token))} title={"Pause"} />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title="Reset"
            icon={Icon.Stop}
            actions={
              <ActionPanel>
                <Action onAction={createAction(async () => slackResetInterval(token))} title={"Reset"} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Restart Current"
            icon={Icon.Repeat}
            actions={
              <ActionPanel>
                <Action onAction={createAction(async () => slackRestartInterval(token))} title={"Restart Current"} />
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
                <Action onAction={createAction(async () => slackCreateInterval("focus", token))} title={"Focus"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Short Break`}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            actions={
              <ActionPanel>
                <Action
                  onAction={createAction(async () => slackCreateInterval("short-break", token))}
                  title={"Short Break"}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Long Break`}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            actions={
              <ActionPanel>
                <Action
                  onAction={createAction(async () => slackCreateInterval("long-break", token))}
                  title={"Long Break"}
                />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
};

const EndOfInterval = () => {
  let markdownImage;
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

  if (preferences.giphyAPIKey) {
    const { isLoading, data } = useFetch(
      `https://api.giphy.com/v1/gifs/random?api_key=${preferences.giphyAPIKey}&tag=${preferences.giphyTag}&rating=${preferences.giphyRating}`,
      {
        keepPreviousData: true,
      },
    );
    if (!isLoading && data) {
      const giphyResponse = data as GiphyResponse;
      markdownImage = `![${giphyResponse.data.title}](${giphyResponse.data.images.fixed_height.url})`;
      usingGiphy = true;
    } else if (isLoading) {
      ("You did it!");
    } else {
      markdownImage = `![${"You did it!"}](${preferences.completionImage})`;
    }
  } else {
    markdownImage = `![${"You did it!"}](${preferences.completionImage})`;
  }

  const { token } = getAccessToken();
  const executor = getNextSlackIntervalExecutor();

  return (
    <Detail
      navigationTitle={`Interval completed`}
      markdown={`${usingGiphy ? `![powered by GIPHY](Poweredby_100px-White_VertLogo.png) \n \n` : ""}` + markdownImage}
      actions={
        <ActionPanel title="Start Next Interval">
          <Action
            title={executor.title}
            onAction={createAction(async () => await executor.onStart(token))}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title={FocusText}
            onAction={createAction(async () => slackCreateInterval("focus", token))}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title={ShortBreakText}
            onAction={createAction(() => slackCreateInterval("short-break", token))}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title={LongBreakText}
            onAction={createAction(async () => slackCreateInterval("long-break", token))}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
};

const slackClient = OAuthService.slack({
  scope: "users.profile:write dnd:write",
});

export default withAccessToken(slackClient)(Command);

export function Command(props: { launchContext?: { currentInterval: string } }) {
  return props.launchContext?.currentInterval ? <EndOfInterval /> : <ActionsList />;
}
