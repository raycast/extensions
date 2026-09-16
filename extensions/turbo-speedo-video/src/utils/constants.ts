export const SUPPORTED_EXTENSIONS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'flv',
  'wmv',
  'm4v',
  '3gp',
  'ogv',
] as const;

/**
 * Keep each atempo factor between 0.5 and 2 to avoid skipping audio samples.
 */
export const MAX_AUDIO_SPEED = 2.0;

export const SPEED_OPTIONS = [
  { value: '0.25', label: '0.25x (Quarter Speed)', hasAudioLimit: false },
  { value: '0.5', label: '0.5x (Half Speed)', hasAudioLimit: false },
  { value: '0.75', label: '0.75x (Slightly Slower)', hasAudioLimit: false },
  { value: '1', label: '1x (Normal Speed)', hasAudioLimit: false },
  { value: '1.25', label: '1.25x (Slightly Faster)', hasAudioLimit: false },
  { value: '1.5', label: '1.5x (Faster)', hasAudioLimit: false },
  { value: '2', label: '2x (Double Speed)', hasAudioLimit: false },
  { value: '2.5', label: '2.5x (Audio Resampled)', hasAudioLimit: true },
  { value: '3', label: '3x (Audio Resampled)', hasAudioLimit: true },
  { value: '4', label: '4x (Audio Resampled)', hasAudioLimit: true },
  { value: '5', label: '5x (Audio Resampled)', hasAudioLimit: true },
  { value: '6', label: '6x (Audio Resampled)', hasAudioLimit: true },
  { value: '8', label: '8x (Audio Resampled)', hasAudioLimit: true },
  { value: '10', label: '10x (Audio Resampled)', hasAudioLimit: true },
  { value: '15', label: '15x (Audio Resampled)', hasAudioLimit: true },
  { value: '20', label: '20x (Audio Resampled)', hasAudioLimit: true },
  { value: '30', label: '30x (Audio Resampled)', hasAudioLimit: true },
  { value: '40', label: '40x (Audio Resampled)', hasAudioLimit: true },
] as const;

export const FRAMERATE_OPTIONS = [
  { value: '24', label: '24 fps (Cinematic)' },
  { value: '30', label: '30 fps (Standard)' },
  { value: '60', label: '60 fps (Smooth)' },
] as const;

export const AUDIO_OPTIONS = [
  { value: 'keep', label: 'Keep Audio' },
  { value: 'remove', label: 'Remove Audio' },
] as const;

export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number]['value'];
export type Framerate = (typeof FRAMERATE_OPTIONS)[number]['value'];
export type AudioOption = (typeof AUDIO_OPTIONS)[number]['value'];
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];
