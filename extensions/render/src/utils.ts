import { getPreferenceValues, Icon } from '@raycast/api';
import { DeployStatus, ServiceResponse } from './service';

export function getKey() {
  const { key } = getPreferenceValues<Preferences>();
  return key;
}

export function getServiceIcon(service: ServiceResponse): string {
  function getFileName(service: ServiceResponse) {
    switch (service.type) {
      case 'static_site':
        return 'site';
      case 'web_service':
        return 'web';
      case 'private_service':
        return 'private';
      case 'background_worker':
        return 'worker';
      case 'cron_job':
        return 'cron';
    }
  }

  const name = getFileName(service);
  return `service/${name}.png`;
}

export function getServiceUrl(service: ServiceResponse) {
  function getPrefix(service: ServiceResponse) {
    switch (service.type) {
      case 'static_site':
        return 'static';
      case 'web_service':
        return 'web';
      case 'private_service':
        return 'pserv';
      case 'background_worker':
        return 'worker';
      case 'cron_job':
        return 'cron';
    }
  }

  const prefix = getPrefix(service);
  return `https://dashboard.render.com/${prefix}/${service.id}`;
}

export function getDeployUrl(service: ServiceResponse, id: string) {
  const serviceUrl = getServiceUrl(service);
  return `${serviceUrl}/deploys/${id}`;
}

export function getDeployStatusIcon(status: DeployStatus): Icon | undefined {
  switch (status) {
    case 'live':
      return Icon.Checkmark;
    case 'deactivated':
      return Icon.Circle;
    case 'canceled':
      return Icon.Dot;
    case 'build_failed':
      return Icon.XMarkCircle;
  }
}

export function getCommitUrl(repoUrl: string, commitId: string) {
  return `${repoUrl}/commit/${commitId}`;
}

export function getDomainIcon(isVerified: boolean): Icon {
  return isVerified ? Icon.Checkmark : Icon.XMarkCircle;
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

export function formatServiceType(service: ServiceResponse): string {
  switch (service.type) {
    case 'static_site':
      return 'Static site';
    case 'web_service':
      return 'Web service';
    case 'private_service':
      return 'Private service';
    case 'background_worker':
      return 'Background worker';
    case 'cron_job':
      return 'Cron job';
  }
}

export function formatDeployStatus(status: DeployStatus): string {
  switch (status) {
    case 'live':
      return 'live';
    case 'deactivated':
      return 'succeeded';
    case 'canceled':
      return 'canceled';
    case 'build_failed':
      return 'failed';
  }
}

export function formatCommit(commit: string): string {
  return commit.split('\n')[0];
}
