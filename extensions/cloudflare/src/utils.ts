import {
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
} from '@raycast/api';
import { AxiosError } from 'axios';
import {
  DeploymentStatus,
  DomainStatus,
  MemberStatus,
  Source,
  ZoneStatus,
} from './service';
import { showFailureToast } from '@raycast/utils';

const CLOUDFLARE_BASE = 'https://dash.cloudflare.com';

function getToken() {
  const { token } = getPreferenceValues<ExtensionPreferences>();
  return token;
}

function getSiteStatusIcon(status: ZoneStatus): Icon {
  switch (status) {
    case 'active':
      return Icon.CheckCircle;
    case 'pending':
    case 'initializing':
      return Icon.Circle;
    case 'moved':
      return Icon.ArrowRightCircle;
    case 'deleted':
    case 'deactivated':
    case 'read only':
      return Icon.XMarkCircle;
  }
}

function getDeploymentStatusIcon(status: DeploymentStatus): Icon {
  switch (status) {
    case 'active':
      return Icon.Circle;
    case 'success':
      return Icon.CheckCircle;
    case 'failure':
      return Icon.XMarkCircle;
  }
}

function getDomainStatusIcon(status: DomainStatus): Icon {
  switch (status) {
    case 'pending':
      return Icon.Circle;
    case 'active':
      return Icon.CheckCircle;
  }
}

function getMemberStatusIcon(status: MemberStatus): Icon {
  switch (status) {
    case 'pending':
      return Icon.Circle;
    case 'accepted':
      return Icon.CheckCircle;
    case 'rejected':
      return Icon.XMarkCircle;
  }
}

function getSiteUrl(accountId: string, domain: string): string {
  return `${CLOUDFLARE_BASE}/${accountId}/${domain}`;
}

function getPageUrl(accountId: string, pageName: string): string {
  return `${CLOUDFLARE_BASE}/${accountId}/pages/view/${pageName}`;
}

function getDeploymentUrl(
  accountId: string,
  pageName: string,
  deploymentId: string,
): string {
  return `${CLOUDFLARE_BASE}/${accountId}/pages/view/${pageName}/${deploymentId}`;
}

function getRepoUrl(source: Source): string {
  switch (source.type) {
    case 'github':
      return `https://github.com/${source.config.owner}/${source.config.repo}`;
    case 'gitlab':
      return `https://gitlab.com/${source.config.owner}/${source.config.repo}`;
  }
}

function getCommitUrl(source: Source, hash: string): string {
  return `${getRepoUrl(source)}/tree/${hash}`;
}

function toUrl(domain: string): string {
  return `https://${domain}`;
}

async function handleNetworkError(e: unknown): Promise<void> {
  const error = e as AxiosError;

  const response = error.response;
  const toast = await showFailureToast('Please try again later.');
  if (!response) {
    toast.title = 'Unknown error';
    return;
  }

  const status = response.status;
  if (!status) {
    toast.title = 'Network error';
    return;
  }

  if (status === 401) {
    toast.title = 'Failed to authorize';
    toast.message = 'Please make sure that your API token is valid.';
    toast.primaryAction = {
      title: 'Open Extension Preferences',
      onAction: openExtensionPreferences,
    };
  } else {
    const data = response.data as {
      errors: Array<{ code: number; message: string }>;
    };
    const error = data.errors[0];
    toast.title = `${error.code} error`;
    toast.message = error.message;
  }
}

export {
  getToken,
  getSiteStatusIcon,
  getDeploymentStatusIcon,
  getDomainStatusIcon,
  getMemberStatusIcon,
  getSiteUrl,
  getPageUrl,
  getDeploymentUrl,
  getRepoUrl,
  getCommitUrl,
  toUrl,
  handleNetworkError,
};
