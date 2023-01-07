import { Color, Icon } from '@raycast/api';

import { DeployState, Framework, GitProvider } from './interfaces';
import { capitalize } from './helpers';

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

export function getGitProviderIcon(slug: GitProvider):
  | {
      source: string;
      tintColor?: Color;
    }
  | undefined {
  if (!slug) {
    return;
  }

  const gitProviderMap = {
    'azure-devops': { source: 'vcs/azure.svg', tintColor: Color.Blue },
    bitbucket: { source: 'vcs/bitbucket.svg', tintColor: Color.Blue },
    github: { source: 'vcs/github.svg', tintColor: Color.PrimaryText },
    github_enterprise: {
      source: 'vcs/github.svg',
      tintColor: Color.PrimaryText,
    },
    gitlab: { source: 'vcs/gitlab.svg' },
    gitlab_self_hosted: { source: 'vcs/gitlab.svg' },
    unknown: {
      source: '',
      tintColor: Color.PrimaryText,
    },
  };

  return gitProviderMap[slug];
}
