import { SimplifiedTeam } from '../types';
import { getConfigs } from './config';

export function getJiraProjectLink(team: SimplifiedTeam | null): string {
  return team && team.project ? team.project : '';
}

export function renderJiraProjectLinkMarkdown(team: SimplifiedTeam | null): string {
  const link = getJiraProjectLink(team);
  return link ? `[${link}](${link})` : 'none';
}

export function getSlackChannelRedirectLink(team: SimplifiedTeam | null): string {
  const { slackRedirectLink } = getConfigs();

  if (team && team.slack && slackRedirectLink) {
    const slackChannel = team.slack;
    const slackLink = slackRedirectLink.replace('{query}', slackChannel.replaceAll('#', ''));
    return slackLink;
  }

  return '';
}

export function renderSlackChannelRedirectLinkMarkdown(team: SimplifiedTeam | null): string {
  const slackLink = getSlackChannelRedirectLink(team);
  const slackChannel = team ? team.slack : '';

  if (slackLink && slackChannel) {
    return `[${slackChannel}](${slackLink})`;
  }

  return 'none';
}

export function renderMembers(team: SimplifiedTeam | null): string {
  if (team && team.contributors) {
    return ['', ...team.contributors.map((it) => `  * ${it}`)].join('\n');
  }

  return 'none';
}
