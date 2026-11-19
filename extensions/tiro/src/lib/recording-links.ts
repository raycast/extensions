/** Desktop widget contract, updated 2026-11-05 from the desktop 4.12.1 release contract.
 * End-live finishes a live note and creates the document; end-offline uploads.
 * No legacy fallback: it could affect a different recording mode.
 */
export const RECORDING_ACTIONS = ["start-live", "end-live", "start-offline", "end-offline"] as const;
export type RecordingAction = (typeof RECORDING_ACTIONS)[number];
const routes: Record<RecordingAction, string> = {
  "start-live": "notes/create/live-voice",
  "start-offline": "notes/create/offline-mode",
  "end-live": "notes/end/live-voice",
  "end-offline": "notes/end/offline-mode",
};
export function recordingUrl(action: RecordingAction): string {
  return `tiro://${routes[action]}?background=true`;
}
