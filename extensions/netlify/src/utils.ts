import {
  Color,
  Icon,
  Toast,
  showToast,
  getPreferenceValues,
} from '@raycast/api';
import { AxiosError } from 'axios';

import { DeployState, Preferences } from './interfaces';

export function getToken() {
  const { token } = getPreferenceValues<Preferences>();
  return token;
}

export function getDeployUrl(siteName: string, id: string) {
  return `https://app.netlify.com/sites/${siteName}/deploys/${id}`;
}

export function getDomainUrl(team: string, name: string) {
  return `https://app.netlify.com/teams/${team}/dns/${name}`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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

export function handleNetworkError(e: unknown): void {
  const error = e as AxiosError;
  const status = error.response?.status;
  if (!status) {
    showToast(Toast.Style.Failure, 'Unknown error');
  }
  if (status === 401) {
    showToast(
      Toast.Style.Failure,
      'Failed to authorize',
      'Please make sure that your API key is valid.',
    );
  } else {
    showToast(Toast.Style.Failure, 'Network error', 'Please try again later.');
  }
}
