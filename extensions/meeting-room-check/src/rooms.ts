/**
 * Bundled default room list — intentionally EMPTY in this public Store
 * version.
 *
 * Ticsi's real Mito room list (name/floor/capacity/equipment + the Calendar
 * resource email needed for freeBusy.query and events.insert) lives only in
 * his own local Raycast LocalStorage, never in this source file. Raycast
 * Store submissions are open source in Raycast's public GitHub repo, so
 * anything hardcoded here would be publicly visible — not just functionally
 * reachable. See SESSION_PRIMER.md's "Must-do before actual Store
 * submission" note for the full reasoning.
 *
 * Distribution works instead via onboarding.tsx's "Import Room List" /
 * importExport.tsx's Export — Ticsi exports his real list from his own
 * install and shares the JSON directly with Studio teammates (Slack,
 * email, shared doc), completely bypassing the public package.
 *
 * If this file is ever populated for a private/internal build (not the
 * public Store submission), roomStore.ts's loadOrSeedRooms() will
 * auto-seed it for any @mito.hu account. Keep it empty for anything that
 * might end up in the public repo.
 */
export type StaticRoom = {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  equipment: string[];
  calendarId: string;
};

export const ROOMS: StaticRoom[] = [];
