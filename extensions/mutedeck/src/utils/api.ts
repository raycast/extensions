import { getPreferenceValues } from '@raycast/api';
import fetch from 'node-fetch';

export const getPreferences = getPreferenceValues;

export interface MuteDeckStatus {
  running: boolean;
  inMeeting: boolean;
  muted: boolean;
  videoOn: boolean;
  share: string;
  record: string;
}

export async function getStatus(): Promise<MuteDeckStatus> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();

  try {
    const response = await fetch(apiEndpoint + '/status');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as MuteDeckStatus;
    return data;
  } catch (error) {
    throw new Error(
      'Failed to get MuteDeck status: ' + (error instanceof Error ? error.message : String(error))
    );
  }
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
  return status.share === 'active';
}

export function isRecording(status: MuteDeckStatus): boolean {
  return status.record === 'active';
}

export async function toggleMute(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();
  const response = await fetch(apiEndpoint + '/mute/toggle', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to toggle mute: ${response.statusText}`);
  }
}

export async function toggleVideo(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();
  const response = await fetch(apiEndpoint + '/video/toggle', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to toggle video: ${response.statusText}`);
  }
}

export async function leaveMeeting(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();
  const response = await fetch(apiEndpoint + '/leave', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to leave meeting: ${response.statusText}`);
  }
}
