import { AxiosError } from 'axios';

import { DeployState, Role } from './interfaces';
import { showFailureToast } from '@raycast/utils';

const VALID_EMAIL = /^[^@]+@[^@]+\.[^@]+$/;

export function capitalize(s: string): string {
  return s[0].toUpperCase() + s.substr(1);
}

export function formatDate(timestamp: string | number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getDeployUrl(siteName: string, id: string) {
  return `https://app.netlify.com/sites/${siteName}/deploys/${id}`;
}

export function getDomainUrl(team: string, name: string) {
  return `https://app.netlify.com/teams/${team}/dns/${name}`;
}

export function getStatusText(state: DeployState, errorMessage?: string) {
  if (errorMessage && /cancell?ed/i.test(errorMessage)) {
    state = 'canceled';
  }
  return state.toUpperCase();
}

export function handleNetworkError(e: unknown): void {
  const error = e as AxiosError;
  const status = error.response?.status;
  if (!status) {
    showFailureToast('Please try again.', { title: 'Unknown error' });
  }
  if (status === 401) {
    showFailureToast('Check your API key.', { title: 'Failed to authorize' });
  } else {
    showFailureToast(`Error code ${status}`, { title: 'Network error' });
  }
}

export function humanRole(role: Role): string {
  return role === 'Controller' ? 'Billing Admin' : role;
}

export const isValidEmail = (email?: string | null): boolean =>
  VALID_EMAIL.test(email || '');

export function snakeCaseToTitleCase(s: string): string {
  return s
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}
