import { getPreferenceValues } from '@raycast/api';
import fetch from 'node-fetch';

export const getPreferences = getPreferenceValues;

export type CallStatus = 'active';
export type ControlSystem = 'system' | 'zoom' | 'webex' | 'teams' | 'google-meet';
export type ActiveStatus = 'active' | 'inactive';
export type FeatureStatus = 'active' | 'inactive' | 'disabled';

export interface MuteDeckStatus {
  call?: CallStatus;
  control?: ControlSystem;
  mute: ActiveStatus;
  video: FeatureStatus;
  share: FeatureStatus;
  record: FeatureStatus;
  status: number;
}

export async function getStatus(): Promise<MuteDeckStatus> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();

  try {
    const response = await fetch(apiEndpoint + '/v1/status');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as MuteDeckStatus;
    return data;
  } catch (error) {
    throw new Error(
      'Failed to get MuteDeck status: ' + (error instanceof Error ? error.message : String(error)),
    );
  }
}

export function isMuteDeckRunning(status: MuteDeckStatus): boolean {
  return status.status === 200;
}

export function isInMeeting(status: MuteDeckStatus): boolean {
  return status.call === 'active';
}

export function isMuted(status: MuteDeckStatus): boolean {
  return status.mute === 'active';
}

export function isVideoOn(status: MuteDeckStatus): boolean {
  return status.video === 'active';
}

export function isPresenting(status: MuteDeckStatus): boolean {
  return status.share === 'active';
}

export function isRecording(status: MuteDeckStatus): boolean {
  return status.record === 'active';
}

export async function toggleMute(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();
  const response = await fetch(apiEndpoint + '/v1/mute', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to toggle mute: ${response.statusText}`);
  }
}

export async function toggleVideo(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();
  const response = await fetch(apiEndpoint + '/v1/video', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to toggle video: ${response.statusText}`);
  }
}

export async function leaveMeeting(): Promise<void> {
  const { apiEndpoint } = getPreferenceValues<{ apiEndpoint: string }>();
  const response = await fetch(apiEndpoint + '/v1/leave', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to leave meeting: ${response.statusText}`);
  }
}
