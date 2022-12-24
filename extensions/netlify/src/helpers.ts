import { Color, Icon } from '@raycast/api';

import { DeployState, Framework, GitProvider } from './interfaces';
import { capitalize } from './utils';

export function getStatusIcon(state: DeployState): {
  source: Icon;
  tintColor: Color;
} {
  const deployStateMap = {
    retrying: { source: Icon.Circle, tintColor: Color.Yellow },
    new: { source: Icon.Circle, tintColor: Color.Yellow },
    pending_review: { source: Icon.Circle, tintColor: Color.Yellow },
    accepted: { source: Icon.Circle, tintColor: Color.Yellow },
    enqueued: { source: Icon.Circle, tintColor: Color.Yellow },
    building: { source: Icon.CircleProgress25, tintColor: Color.Orange },
    uploading: { source: Icon.CircleProgress50, tintColor: Color.Orange },
    uploaded: { source: Icon.CircleProgress50, tintColor: Color.Orange },
    preparing: { source: Icon.CircleProgress75, tintColor: Color.Orange },
    prepared: { source: Icon.CircleProgress75, tintColor: Color.Orange },
    processing: { source: Icon.CircleProgress100, tintColor: Color.Orange },
    error: { source: Icon.XMarkCircle, tintColor: Color.Red },
    rejected: { source: Icon.XMarkCircle, tintColor: Color.Red },
    deleted: { source: Icon.CheckCircle, tintColor: Color.Red },
    skipped: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
    cancelled: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
    ready: { source: Icon.CheckCircle, tintColor: Color.Green },
  };
  return (
    deployStateMap[state] || {
      source: Icon.QuestionMarkCircle,
      tintColor: Color.SecondaryText,
    }
  );
}

export function getFramework(slug: Framework): {
  name: string;
  slug: Framework;
  source: string;
  tintColor?: Color;
} {
  slug = slug || 'unknown';
  const source = `frameworks/${slug}.svg`;
  const frameworkMap = {
    angular: { name: 'Angular', tintColor: Color.Red },
    astro: { name: 'Astro', tintColor: Color.PrimaryText },
    eleventy: { name: 'Eleventy', tintColor: Color.SecondaryText },
    gatsby: { name: 'Gatsby', tintColor: Color.Purple },
    hugo: { name: 'Hugo', tintColor: Color.Magenta },
    hydrogen: { name: 'Hydrogen' },
    next: { name: 'Next.js', tintColor: Color.PrimaryText },
    nuxt: { name: 'Nuxt.js', tintColor: Color.Green },
    remix: { name: 'Remix', tintColor: Color.PrimaryText },
    solid: { name: 'Solid.js', tintColor: Color.Blue },
    unknown: {
      source: '',
      name: capitalize(slug),
      tintColor: Color.PrimaryText,
    },
  };

  const framework = frameworkMap[slug];
  return {
    slug,
    source,
    ...framework,
  };
}

export function getGitProvider(repoUrl: string):
  | {
      name: string;
      slug: GitProvider;
      repo: string;
      source: string;
      tintColor?: Color;
    }
  | undefined {
  if (!repoUrl || !/^https?:\/\//.test(repoUrl)) {
    return;
  }
  const url = new URL(repoUrl);
  const providers = ['azure', 'bitbucket', 'github', 'gitlab'];
  const slug =
    providers.find((provider) => url.hostname.includes(provider)) || 'unknown';

  const source = `vcs/${slug}.svg`;
  const gitProviderMap = {
    azure: { name: 'Azure DevOps', tintColor: Color.Blue },
    bitbucket: { name: 'Bitbucket', tintColor: Color.Blue },
    github: { name: 'GitHub', tintColor: Color.PrimaryText },
    gitlab: { name: 'GitLab' },
    unknown: {
      source: '',
      name: capitalize(slug),
      tintColor: Color.PrimaryText,
    },
  };

  const gitProvider = gitProviderMap[slug];
  return {
    slug,
    source,
    repo: url.pathname.slice(1, url.pathname.length),
    ...gitProvider,
  };
}
