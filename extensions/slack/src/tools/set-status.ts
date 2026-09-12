import { getSlackWebClient, slack } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * Status text. Keep it short and omit the duration. Provide an empty string together with an empty emoji to clear the status. Omit both text and emoji when only changing snooze.
   */
  text?: string;
  /**
   * A Slack-compatible emoji in the form :emoji:. Provide an empty string together with empty text to clear the status. Omit both text and emoji when only changing snooze.
   */
  emoji?: string;
  /**
   * Status duration in seconds. Only provide it when the user specifies when the status should expire.
   */
  duration?: number;
  /**
   * Do Not Disturb duration in minutes. A positive integer starts or changes snooze. Use 0 to end the current snooze. Omit it to leave snooze unchanged.
   */
  snoozeMinutes?: number;
};

let retried = false;

async function setStatus(input: Input) {
  const hasStatusInput = input.text !== undefined || input.emoji !== undefined || input.duration !== undefined;
  const hasSnoozeInput = input.snoozeMinutes !== undefined;

  if (!hasStatusInput && !hasSnoozeInput) {
    throw new Error("Provide a status or snooze duration");
  }

  if (hasStatusInput && (input.text === undefined || input.emoji === undefined)) {
    throw new Error("Status text and emoji must be provided together");
  }

  if (input.duration !== undefined && (!Number.isInteger(input.duration) || input.duration < 0)) {
    throw new Error("Status duration must be a non-negative integer number of seconds");
  }

  if (input.snoozeMinutes !== undefined && (!Number.isInteger(input.snoozeMinutes) || input.snoozeMinutes < 0)) {
    throw new Error("Snooze duration must be a non-negative integer number of minutes");
  }

  const slackWebClient = getSlackWebClient();

  try {
    const [statusResponse, snoozeResponse] = await Promise.all([
      hasStatusInput
        ? slackWebClient.users.profile.set({
            profile: {
              status_text: input.text,
              status_emoji: input.emoji,
              status_expiration: input.duration ? Math.floor(Date.now() / 1000) + input.duration : 0,
            },
          })
        : undefined,
      input.snoozeMinutes === undefined
        ? undefined
        : input.snoozeMinutes === 0
          ? slackWebClient.dnd.endSnooze()
          : slackWebClient.dnd.setSnooze({ num_minutes: input.snoozeMinutes }),
    ]);

    if (statusResponse?.error) {
      throw new Error(statusResponse.error);
    }
    if (snoozeResponse?.error) {
      throw new Error(snoozeResponse.error);
    }

    return {
      profile: statusResponse?.profile,
      snooze: hasSnoozeInput
        ? {
            enabled: input.snoozeMinutes !== 0,
            minutes: input.snoozeMinutes,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("missing_scope") && !retried) {
      retried = true;
      await slack.client.removeTokens();
      return withSlackClient(setStatus)(input);
    }
    throw error;
  }
}

export default withSlackClient(setStatus);
