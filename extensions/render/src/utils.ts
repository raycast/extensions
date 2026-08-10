import { getPreferenceValues, Icon, Color } from '@raycast/api';
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

export function getDeployStatusIcon(status: DeployStatus): Icon {
  switch (status) {
    case 'created':
    case 'queued':
      return Icon.Clock;
    case 'build_in_progress':
    case 'update_in_progress':
    case 'pre_deploy_in_progress':
      return Icon.ArrowClockwise;
    case 'live':
      return Icon.Checkmark;
    case 'deactivated':
      return Icon.CircleDisabled;
    case 'canceled':
      return Icon.XMarkCircle;
    case 'build_failed':
    case 'update_failed':
    case 'pre_deploy_failed':
      return Icon.ExclamationMark;
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
    case 'created':
      return 'Created';
    case 'queued':
      return 'Queued';
    case 'build_in_progress':
    case 'update_in_progress':
      return 'Deploying...';
    case 'pre_deploy_in_progress':
      return 'Pre-deploy...';
    case 'live':
      return 'Deployed';
    case 'deactivated':
      return 'Deactivated';
    case 'canceled':
      return 'Canceled';
    case 'build_failed':
      return 'Build Failed';
    case 'update_failed':
      return 'Update Failed';
    case 'pre_deploy_failed':
      return 'Pre-deploy Failed';
  }
}

export function getDeployStatusColor(status: DeployStatus): Color {
  switch (status) {
    case 'created':
    case 'queued':
      return Color.SecondaryText;
    case 'build_in_progress':
    case 'update_in_progress':
    case 'pre_deploy_in_progress':
      return Color.Blue;
    case 'live':
      return Color.Green;
    case 'deactivated':
      return Color.SecondaryText;
    case 'canceled':
      return Color.Orange;
    case 'build_failed':
    case 'update_failed':
    case 'pre_deploy_failed':
      return Color.Red;
  }
}

export function formatCommit(commit: string): string {
  return commit.split('\n')[0];
}

export function isDeployInProgress(status: DeployStatus): boolean {
  return (
    status === 'created' ||
    status === 'queued' ||
    status === 'build_in_progress' ||
    status === 'update_in_progress' ||
    status === 'pre_deploy_in_progress'
  );
}
