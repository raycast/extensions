export const TRACK_ROLES = ["Intro", "Skit", "Interlude", "Outro"] as const;

export type TrackRole = (typeof TRACK_ROLES)[number];
