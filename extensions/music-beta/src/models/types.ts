import { z } from "zod";

const scriptErrorSchema = z.object({
	shortMessage: z.string(),
	command: z.string(),
	failed: z.boolean(),
});

export interface ScriptError extends Error {
	shortMessage: string;
	command: string;
	failed: boolean;
}

export const ScriptError = {
	is: (error: Error): error is ScriptError => scriptErrorSchema.safeParse(error).success,
};

export enum PlayerState {
	PLAYING = "playing",
	PAUSED = "paused",
	STOPPED = "stopped",
}

export enum SFSymbols {
	WARNING = "􀁟",
	ADD_TO_LIBRARY = "􀈄",
	DISLIKE = "􀊂",
	LOVE = "􀊵",
	TRACK_NEXT = "􀊌",
	TRACK_PREVIOUS = "􀊊",
	PLAY = "􀊃",
	PLAY_FILL = "􀊄",
	PAUSE = "􀊆",
	PLAYPAUSE = "􀊈",
	SHUFFLE = "􀊝",
	ARTIST = "􀑫",
	PLAYLIST = "􀑬",
	MUSIC_NOTE = "􀑪",
	STAR = "􀋂",
	STAR_FILL = "􀋃",
	TIME = "􀐫",
	SPEAKER_FILL = "􀊡",
	SPEAKER_FILL_PLUS = "􁜋",
	SPEAKER_FILL_MINUS = "􁜍",
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type HintedString<T> = (string & {}) & T;
