import { getPreferenceValues, Icon, showToast, Toast } from '@raycast/api';
import { AxiosError } from 'axios';
import {
  DeploymentStatus,
  DomainStatus,
  MemberStatus,
  Source,
  ZoneStatus,
} from './service';

const CLOUDFLARE_BASE = 'https://dash.cloudflare.com';

interface Preferences {
  token: string;
}

function getToken() {
  const { token } = getPreferenceValues<Preferences>();
  return token;
}

function getSiteStatusIcon(status: ZoneStatus): Icon {
  switch (status) {
    case 'active':
      return Icon.Checkmark;
    case 'pending':
    case 'initializing':
      return Icon.Circle;
    case 'moved':
      return Icon.ArrowRight;
    case 'deleted':
    case 'deactivated':
    case 'read only':
      return Icon.XmarkCircle;
  }
}

function getDeploymentStatusIcon(status: DeploymentStatus): Icon {
  switch (status) {
    case 'active':
      return Icon.Circle;
    case 'success':
      return Icon.Checkmark;
    case 'failure':
      return Icon.XmarkCircle;
  }
}

function getDomainStatusIcon(status: DomainStatus): Icon {
  switch (status) {
    case 'pending':
      return Icon.Circle;
    case 'active':
      return Icon.Checkmark;
  }
}

function getMemberStatusIcon(status: MemberStatus): Icon {
  switch (status) {
    case 'pending':
      return Icon.Circle;
    case 'accepted':
      return Icon.Checkmark;
    case 'rejected':
      return Icon.XmarkCircle;
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

function handleNetworkError(e: unknown): void {
  const error = e as AxiosError;
  const status = error.response?.status;
  if (!status) {
    showToast(Toast.Style.Failure, 'Unknown error');
  }
  if (status === 400 || status === 403) {
    showToast(
      Toast.Style.Failure,
      'Failed to authorize',
      'Please make sure that your API token is valid.',
    );
  } else {
    showToast(Toast.Style.Failure, 'Network error', 'Please try again later.');
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
