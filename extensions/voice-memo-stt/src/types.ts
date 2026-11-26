/**
 * One recording as published by `vmt list --json`. The field names are a
 * contract owned by internal/listing in the Go module; changing one there
 * without changing it here breaks this extension.
 */
export type Recording = {
  id: number;
  title: string;
  path: string;
  audio_path: string;
  duration: number;
  duration_formatted: string;
  date: string;
  transcribed: boolean;
  chars: number;
  outputs: Record<string, string>;
};
