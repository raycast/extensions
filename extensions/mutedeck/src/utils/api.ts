import { getPreferenceValues } from '@raycast/api';
import fetch from 'node-fetch';

interface Preferences {
  apiEndpoint: string;
}

interface ApiResponse {
  error?: string;
  status: number;
}

interface MuteDeckApiStatus extends ApiResponse {
  call: string;
  control: string;
  mute: string;
  record: string;
  share: string;
  teams_api: string;
  video: string;
}

export interface MuteDeckStatus {
  running: boolean;
  inMeeting: boolean;
  muted: boolean;
  videoOn: boolean;
  share: string;
  record: string;
}

export async function getStatus(): Promise<MuteDeckStatus> {
  const { apiEndpoint } = getPreferenceValues<Preferences>();
  console.log('Debug: Fetching status from', apiEndpoint);
  const response = await fetch(`${apiEndpoint}/v1/status`);
  console.log('Debug: Status response', response.status, response.statusText);
  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.statusText}`);
  }
  const data = (await response.json()) as MuteDeckApiStatus;
  console.log('Debug: Status data', data);
  if (data.error) {
    throw new Error(data.error);
  }
  return {
    running: data.control !== 'disabled',
    inMeeting: data.call === 'active',
    muted: data.mute === 'active',
    videoOn: data.video === 'active',
    share: data.share,
    record: data.record,
  };
}

export function isMuteDeckRunning(status: MuteDeckStatus): boolean {
  return status.running;
}

export function isInMeeting(status: MuteDeckStatus): boolean {
  return status.inMeeting;
}

export function isMuted(status: MuteDeckStatus): boolean {
  return status.muted;
}

export function isVideoOn(status: MuteDeckStatus): boolean {
  return status.videoOn;
}

export function isPresenting(status: MuteDeckStatus): boolean {
  return status.inMeeting && status.share === 'active';
}

export async function toggleMute(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<Preferences>();
  const response = await fetch(`${apiEndpoint}/v1/mute`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to toggle mute: ${response.statusText}`);
  }
  const data = (await response.json()) as ApiResponse;
  if (data.error) {
    throw new Error(data.error);
  }
}

export async function toggleVideo(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<Preferences>();
  const response = await fetch(`${apiEndpoint}/v1/video`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to toggle video: ${response.statusText}`);
  }
  const data = (await response.json()) as ApiResponse;
  if (data.error) {
    throw new Error(data.error);
  }
}

export async function leaveMeeting(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<Preferences>();
  const response = await fetch(`${apiEndpoint}/v1/leave`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to leave meeting: ${response.statusText}`);
  }
  const data = (await response.json()) as ApiResponse;
  if (data.error) {
    throw new Error(data.error);
  }
}

export function isRecording(status: MuteDeckStatus): boolean {
  return status.inMeeting && status.record === 'active';
}

export function getPreferences(): {
  showToasts: boolean;
  confirmMuteInPresentation: boolean;
  confirmVideoInPresentation: boolean;
} {
  return getPreferenceValues<{
    showToasts: boolean;
    confirmMuteInPresentation: boolean;
    confirmVideoInPresentation: boolean;
  }>();
}
