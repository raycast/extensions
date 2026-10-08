import { getApplications, showToast, Toast, showHUD } from '@raycast/api';
import { runAppleScript, showFailureToast } from '@raycast/utils';

export const APP_NAME = 'LookAway';
export const REQUIRED_VERSION = '1.11.3';
export const REQUIRED_VERSION_FOR_START_STOP = '1.13.5';
export const APP_BUNDLE_ID_BASE = 'com.mysticalbits.lookaway';

// Simple version comparison (e.g., "1.11.3" vs "1.10.0")
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const n1 = parts1[i] || 0;
    const n2 = parts2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

async function findLookAwayApp(): Promise<string | null> {
  const applications = await getApplications();
  const lookAwayApp = applications.find((app) => app.bundleId?.startsWith(APP_BUNDLE_ID_BASE));
  return lookAwayApp?.bundleId || null;
}

export async function isLookAwayInstalledAndRecent(requiredVersion: string = REQUIRED_VERSION): Promise<boolean> {
  const bundleId = await findLookAwayApp();

  if (!bundleId) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${APP_NAME} not found`,
      message: `Please install ${APP_NAME} from lookaway.com`,
    });
    return false;
  }

  try {
    const versionScript = `tell application id "${bundleId}" to get version`;
    const installedVersion = await runAppleScript(versionScript);

    if (compareVersions(installedVersion, requiredVersion) < 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${APP_NAME} version v${requiredVersion} required`,
        message: `Please update to ${APP_NAME} v${requiredVersion} or later to run this command.`,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error getting LookAway version:', error);
    await showFailureToast(error, {
      title: `Could not verify ${APP_NAME} version`,
      message: `Please ensure ${APP_NAME} is running and try again.`,
    });
    return false;
  }
}

export async function runLookAwayCommand(
  commandName: string,
  commandCode: string,
  successMessage: string,
  durationSeconds?: number,
  requiredVersion?: string,
) {
  if (!(await isLookAwayInstalledAndRecent(requiredVersion))) {
    return;
  }

  const bundleId = await findLookAwayApp();

  let script: string;
  let finalSuccessMessage = successMessage;

  // Construct the script based on command code and arguments
  switch (commandCode) {
    case 'paustemp':
    case 'pstpnbrk': {
      if (durationSeconds === undefined || durationSeconds <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Invalid Duration',
          message: 'Duration must be a positive number of seconds.',
        });
        return;
      }
      if (commandCode === 'paustemp') {
        script = `tell application id "${bundleId}" to pause temporarily for ${durationSeconds}`;
      } else {
        // pstpnbrk
        script = `tell application id "${bundleId}" to postpone break by ${durationSeconds}`;
      }
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;

      let formattedDuration = '';
      if (hours > 0) formattedDuration += `${hours}h`;
      if (minutes > 0) formattedDuration += `${formattedDuration ? ' ' : ''}${minutes}m`;
      if (seconds > 0 || (hours === 0 && minutes === 0))
        formattedDuration += `${formattedDuration ? ' ' : ''}${seconds}s`;

      finalSuccessMessage = `${successMessage} for ${formattedDuration}`;
      break;
    }
    default:
      if (durationSeconds !== undefined) {
        console.warn(`Duration argument provided for command '${commandName}' which does not support it.`);
      }
      script = `tell application id "${bundleId}" to ${commandName}`;
      break;
  }

  try {
    await runAppleScript(script);
    await showHUD(finalSuccessMessage);
  } catch (error) {
    console.error(`Error running command ${commandName}:`, error);
    await showFailureToast(error, { title: `Failed to run '${commandName}'` });
  }
}
