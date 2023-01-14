import { Action, Icon } from '@raycast/api';

import { getGitProviderIcon } from '../utils/icons';
import { GitProvider } from '../utils/interfaces';

export const OpenOnNetlify = ({ url }: { url: string }) => (
  <Action.OpenInBrowser
    icon="icon.png"
    shortcut={{ key: 'n', modifiers: ['cmd'] }}
    title="Open on Netlify"
    url={url}
  />
);

export const OpenRepo = ({ url }: { url: string }) => {
  const hostname = new URL(url).host;
  let provider, title;
  if (/github/.test(hostname)) {
    provider = 'github';
    title = 'Open on GitHub';
  } else if (/gitlab/.test(hostname)) {
    provider = 'gitlab';
    title = 'Open on GitLab';
  } else if (/bitbucket/.test(hostname)) {
    provider = 'bitbucket';
    title = 'Open on BitBucket';
  } else if (/azure/.test(hostname)) {
    provider = 'azure';
    title = 'Open on Azure DevOps';
  } else {
    title = 'Open Repository';
  }
  return (
    <Action.OpenInBrowser
      icon={
        provider ? getGitProviderIcon(provider as GitProvider) : Icon.CodeBlock
      }
      shortcut={{ key: 'r', modifiers: ['cmd'] }}
      title={title}
      url={url}
    />
  );
};

export const OpenGitProfile = ({
  provider,
  username,
}: {
  provider: GitProvider;
  username: string;
}) => {
  let title, url;
  if (provider === 'github') {
    title = 'Open GitHub Profile';
    url = `https://github.com/${username}`;
  } else if (provider === 'gitlab') {
    title = 'Open GitLab Profile';
    url = `https://gitlab.com/${username}`;
  } else if (provider === 'bitbucket') {
    title = 'Open BitBucket Profile';
    url = `https://bitbucket.org/${username}`;
  } else {
    return null;
  }
  return (
    <Action.OpenInBrowser
      icon={getGitProviderIcon(provider)}
      title={title}
      url={url}
    />
  );
};
