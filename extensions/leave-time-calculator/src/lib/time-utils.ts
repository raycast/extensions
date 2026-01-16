import type { Language, TimeOption } from "./types";

function parseTime(timeStr: string): Date {
	const parts = timeStr.split(":").map(Number);
	const hours = parts[0] ?? 0;
	const minutes = parts[1] ?? 0;
	const date = new Date();
	date.setHours(hours, minutes, 0, 0);
	return date;
}

export function formatTime(date: Date, lang: Language): string {
	const locale = lang === "ja" ? "ja-JP" : "en-US";
	return date.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

export function getCurrentTime(lang: Language): string {
	return formatTime(new Date(), lang);
}

export function calculateLeaveTime(
	startTime: string,
	workHours: number,
	breakMinutes: number,
	lang: Language,
): string {
	const start = parseTime(startTime);
	const totalMinutes = workHours * 60 + breakMinutes;
	const leave = new Date(start.getTime() + totalMinutes * 60000);
	return formatTime(leave, lang);
}

export function calculateRemainingTime(
	leaveTime: string,
	startTime: string | null,
): { hours: number; minutes: number; isPast: boolean } {
	const now = new Date();
	let leave = parseTime(leaveTime);

	// 出勤時間がある場合、「退勤時刻 < 出勤時刻」なら日をまたぐシフトとみなす
	if (startTime) {
		const start = parseTime(startTime);
		if (leave < start) {
			// 例: start=22:00, leave=06:00 の場合は 22:00〜翌06:00 のシフト
			// このとき leave は「出勤日の翌日」の 06:00 を表す必要がある。
			//
			// ただし、今(now)がどちらの日付側にいるかで、+24時間するかどうかが変わる:
			// - now >= start:
			//     まだ「出勤日」の日中〜夜にいる (例: 23:00)。
			//     退勤は「翌日」の 06:00 なので、leave に +24時間する。
			// - now < start:
			//     すでに日付が変わっており、深夜〜早朝帯にいる (例: 01:00)。
			//     このとき 06:00 は「今いるカレンダー日付」の 06:00 を指すため、
			//     すでに翌日側にいて +24時間は不要。
			if (now >= start) {
				// まだ出勤日の日中〜夜にいる → 退勤はカレンダー上の明日
				leave = new Date(leave.getTime() + 24 * 60 * 60 * 1000);
			}
			// now < start の場合:
			//   シフト的には「前日から続く深夜シフト中」だが、
			//   カレンダー上はすでに退勤日の深夜〜早朝にいるため leave はそのまま使用する。
		}
	}

	const diffMs = leave.getTime() - now.getTime();
	const isPast = diffMs < 0;
	const absDiffMs = Math.abs(diffMs);
	const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
	const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

	return { hours, minutes, isPast };
}

const START_HOURS = [7, 8, 9, 10, 11, 12, 13] as const;
const MINUTE_OPTIONS = [0, 15, 30, 45] as const;

/** HH:MM形式の時間文字列を生成 */
export function formatTimeString(hours: number, minutes: number): string {
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function generateTimeOptions(
	workHours: number,
	breakMinutes: number,
	lang: Language,
): TimeOption[] {
	return START_HOURS.flatMap((hour) =>
		MINUTE_OPTIONS.map((minute) => {
			const startTime = formatTimeString(hour, minute);
			return {
				startTime,
				leaveTime: calculateLeaveTime(startTime, workHours, breakMinutes, lang),
				workHours,
				breakMinutes,
			};
		}),
	);
}
