export function getSlackChannelUrl(slackChannelId: string): string {
  return `https://slack.com/app_redirect?channel=${slackChannelId}`;
}
