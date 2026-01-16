import type { Language } from "./types";

export const translations = {
	ja: {
		// Section titles
		todaySection: "📅 今日の予定",
		selectStartSection: "⏰ 出勤時間を選択",
		customTimeSection: "✏️ カスタム時間",

		// Time display
		remaining: (h: number, m: number) => `あと ${h}時間${m}分`,
		overtime: (h: number, m: number) => `${h}時間${m}分 残業中`,
		leaveDisplay: (time: string) => `🏠 ${time} 退勤`,
		startDisplay: (time: string) => `${time}`,
		workBreakTag: (w: number, b: number) => `勤務${w}h 休憩${b}m`,

		// Actions
		reset: "リセット",
		select: "選択",
		copyLeaveTime: "退勤時間をコピー",

		// Search
		searchBarPlaceholder: "時間を入力 (例: 9:21)",
	},
	en: {
		// Section titles
		todaySection: "📅 Today",
		selectStartSection: "⏰ Select Start Time",
		customTimeSection: "✏️ Custom Time",

		// Time display
		remaining: (h: number, m: number) => `${h}h ${m}m left`,
		overtime: (h: number, m: number) => `${h}h ${m}m overtime`,
		leaveDisplay: (time: string) => `🏠 Leave at ${time}`,
		startDisplay: (time: string) => `${time}`,
		workBreakTag: (w: number, b: number) => `Work ${w}h Break ${b}m`,

		// Actions
		reset: "Reset",
		select: "Select",
		copyLeaveTime: "Copy Leave Time",

		// Search
		searchBarPlaceholder: "Enter time (e.g., 9:21)",
	},
} as const;

export type Translations = typeof translations.ja;

export function getSystemLanguage(): Language {
	const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
	return systemLocale.startsWith("ja") ? "ja" : "en";
}

export function getLanguage(preference: "system" | "ja" | "en"): Language {
	return preference === "system" ? getSystemLanguage() : preference;
}

export function useTranslations(lang: Language) {
	return translations[lang];
}
