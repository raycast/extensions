import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * A string value for status text, should be short and sweet, with no punctuation, e.g. "Working out", "Listening to Drake's new album", "Coffe break". It should not include the status duration for example "Working out" instead of "Working out for 2 hours" or "Working out until tomorrow".
   *
   * To unset the status, provide an empty string.
   */
  text: string;
  /**
   * A Slack-compatible string for single emoji matching the text of the status. Emojis should be in the form: :<emoji identifier>:. If the user doesn't specify an emoji, come up with one that matches the text.
   *
   * To unset the status, provide an empty string.
   */
  emoji: string;
  /**
   * An integer representing the duration of the status in seconds. Only provide it if the user has specified a time or the end of status
   */
  duration?: number;
};

async function setStatus(input: Input) {
  const slackWebClient = getSlackWebClient();

  const res = await slackWebClient.users.profile.set({
    profile: {
      status_text: input.text,
      status_emoji: input.emoji,
      status_expiration: typeof input.duration === "number" ? new Date().getTime() / 1000 + input.duration : 0,
    },
  });

  if (res.error) {
    throw new Error(res.error);
  }

  return res.profile;
}

export default withSlackClient(setStatus);
