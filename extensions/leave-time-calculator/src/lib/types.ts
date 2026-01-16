export interface Preferences {
	defaultWorkHours: string;
	defaultBreakMinutes: string;
	language: "system" | "ja" | "en";
}

export interface TimeOption {
	startTime: string;
	leaveTime: string;
	workHours: number;
	breakMinutes: number;
}

export type Language = "ja" | "en";
