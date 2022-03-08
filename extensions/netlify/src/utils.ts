import { getPreferenceValues } from '@raycast/api';
import { DeployStatus } from './service';

interface Preferences {
  token: string;
}

export function getToken() {
  const { token } = getPreferenceValues<Preferences>();
  return token;
}

export function getSiteUrl(name: string) {
  return `https://app.netlify.com/sites/${name}`;
}

export function getDeployUrl(siteName: string, id: string) {
  return `https://app.netlify.com/sites/${siteName}/deploys/${id}`;
}

export function getDomainUrl(name: string) {
  return `https://app.netlify.com/teams/destiner/dns/${name}`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDeployDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDeployStatus(status: DeployStatus) {
  switch (status) {
    case 'ok':
      return 'deployed';
    case 'skipped':
      return 'skipped';
    case 'error':
      return 'failed';
  }
}
