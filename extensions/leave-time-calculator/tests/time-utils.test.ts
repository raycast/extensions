import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	calculateLeaveTime,
	calculateRemainingTime,
	formatTimeString,
} from "../src/lib/time-utils";

describe("formatTimeString", () => {
	test("1桁の時間を2桁にパディング", () => {
		expect(formatTimeString(9, 0)).toBe("09:00");
		expect(formatTimeString(7, 5)).toBe("07:05");
	});

	test("2桁の時間はそのまま", () => {
		expect(formatTimeString(12, 30)).toBe("12:30");
		expect(formatTimeString(23, 59)).toBe("23:59");
	});

	test("0時0分", () => {
		expect(formatTimeString(0, 0)).toBe("00:00");
	});
});

describe("calculateLeaveTime", () => {
	// ===== 基本パターン =====
	describe("基本的な日中勤務", () => {
		test("9:00出勤 + 8h勤務 + 60m休憩 = 18:00退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 60, "ja");
			expect(result).toBe("18:00");
		});

		test("10:30出勤 + 8h勤務 + 60m休憩 = 19:30退勤", () => {
			const result = calculateLeaveTime("10:30", 8, 60, "ja");
			expect(result).toBe("19:30");
		});

		test("7:00出勤 + 8h勤務 + 60m休憩 = 16:00退勤", () => {
			const result = calculateLeaveTime("07:00", 8, 60, "ja");
			expect(result).toBe("16:00");
		});

		test("8:30出勤 + 7.5h勤務 + 45m休憩 = 16:45退勤", () => {
			const result = calculateLeaveTime("08:30", 7.5, 45, "ja");
			expect(result).toBe("16:45");
		});
	});

	// ===== 日付跨ぎパターン =====
	describe("日付跨ぎ（夜勤パターン）", () => {
		test("22:00出勤 + 8h勤務 + 60m休憩 = 07:00退勤（翌日）", () => {
			const result = calculateLeaveTime("22:00", 8, 60, "ja");
			expect(result).toBe("07:00");
		});

		test("19:00出勤 + 8h勤務 + 60m休憩 = 04:00退勤（翌日）", () => {
			const result = calculateLeaveTime("19:00", 8, 60, "ja");
			expect(result).toBe("04:00");
		});

		test("21:00出勤 + 10h勤務 + 60m休憩 = 08:00退勤（翌日）", () => {
			const result = calculateLeaveTime("21:00", 10, 60, "ja");
			expect(result).toBe("08:00");
		});

		test("23:00出勤 + 8h勤務 + 60m休憩 = 08:00退勤（翌日）", () => {
			const result = calculateLeaveTime("23:00", 8, 60, "ja");
			expect(result).toBe("08:00");
		});

		test("20:00出勤 + 12h勤務 + 120m休憩 = 10:00退勤（翌日）", () => {
			const result = calculateLeaveTime("20:00", 12, 120, "ja");
			expect(result).toBe("10:00");
		});

		test("18:00出勤 + 8h勤務 + 60m休憩 = 03:00退勤（翌日）", () => {
			const result = calculateLeaveTime("18:00", 8, 60, "ja");
			expect(result).toBe("03:00");
		});
	});

	// ===== 境界値テスト =====
	describe("境界値（日付変更線付近）", () => {
		test("23:59出勤 + 8h勤務 + 60m休憩 = 08:59退勤（翌日）", () => {
			const result = calculateLeaveTime("23:59", 8, 60, "ja");
			expect(result).toBe("08:59");
		});

		test("00:00出勤 + 8h勤務 + 60m休憩 = 09:00退勤（同日）", () => {
			const result = calculateLeaveTime("00:00", 8, 60, "ja");
			expect(result).toBe("09:00");
		});

		test("00:01出勤 + 8h勤務 + 60m休憩 = 09:01退勤（同日）", () => {
			const result = calculateLeaveTime("00:01", 8, 60, "ja");
			expect(result).toBe("09:01");
		});

		test("15:00出勤 + 8h勤務 + 60m休憩 = 00:00退勤（ちょうど深夜0時）", () => {
			const result = calculateLeaveTime("15:00", 8, 60, "ja");
			expect(result).toBe("00:00");
		});

		test("15:30出勤 + 8h勤務 + 30m休憩 = 00:00退勤（ちょうど深夜0時）", () => {
			const result = calculateLeaveTime("15:30", 8, 30, "ja");
			expect(result).toBe("00:00");
		});
	});

	// ===== 休憩時間のバリエーション =====
	describe("休憩時間のバリエーション", () => {
		test("休憩なし: 9:00出勤 + 8h勤務 + 0m休憩 = 17:00退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 0, "ja");
			expect(result).toBe("17:00");
		});

		test("休憩15分: 9:00出勤 + 8h勤務 + 15m休憩 = 17:15退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 15, "ja");
			expect(result).toBe("17:15");
		});

		test("休憩30分: 9:00出勤 + 8h勤務 + 30m休憩 = 17:30退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 30, "ja");
			expect(result).toBe("17:30");
		});

		test("休憩45分: 9:00出勤 + 8h勤務 + 45m休憩 = 17:45退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 45, "ja");
			expect(result).toBe("17:45");
		});

		test("休憩90分: 9:00出勤 + 8h勤務 + 90m休憩 = 18:30退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 90, "ja");
			expect(result).toBe("18:30");
		});

		test("休憩120分: 9:00出勤 + 8h勤務 + 120m休憩 = 19:00退勤", () => {
			const result = calculateLeaveTime("09:00", 8, 120, "ja");
			expect(result).toBe("19:00");
		});
	});

	// ===== 勤務時間のバリエーション =====
	describe("勤務時間のバリエーション", () => {
		test("短時間勤務: 9:00出勤 + 4h勤務 + 30m休憩 = 13:30退勤", () => {
			const result = calculateLeaveTime("09:00", 4, 30, "ja");
			expect(result).toBe("13:30");
		});

		test("6h勤務: 9:00出勤 + 6h勤務 + 45m休憩 = 15:45退勤", () => {
			const result = calculateLeaveTime("09:00", 6, 45, "ja");
			expect(result).toBe("15:45");
		});

		test("長時間勤務: 9:00出勤 + 12h勤務 + 60m休憩 = 22:00退勤", () => {
			const result = calculateLeaveTime("09:00", 12, 60, "ja");
			expect(result).toBe("22:00");
		});

		test("非常に長い勤務: 6:00出勤 + 16h勤務 + 90m休憩 = 23:30退勤", () => {
			const result = calculateLeaveTime("06:00", 16, 90, "ja");
			expect(result).toBe("23:30");
		});

		test("24h超え勤務（稀なケース）: 9:00出勤 + 24h勤務 + 60m休憩 = 10:00退勤（翌日）", () => {
			const result = calculateLeaveTime("09:00", 24, 60, "ja");
			expect(result).toBe("10:00");
		});
	});

	// ===== 出勤時刻が現在時刻より遅い場合 =====
	describe("様々な出勤時刻", () => {
		test("早朝出勤: 5:00出勤 + 8h勤務 + 60m休憩 = 14:00退勤", () => {
			const result = calculateLeaveTime("05:00", 8, 60, "ja");
			expect(result).toBe("14:00");
		});

		test("深夜出勤: 3:00出勤 + 8h勤務 + 60m休憩 = 12:00退勤", () => {
			const result = calculateLeaveTime("03:00", 8, 60, "ja");
			expect(result).toBe("12:00");
		});

		test("昼出勤: 12:00出勤 + 8h勤務 + 60m休憩 = 21:00退勤", () => {
			const result = calculateLeaveTime("12:00", 8, 60, "ja");
			expect(result).toBe("21:00");
		});

		test("午後出勤: 13:30出勤 + 8h勤務 + 60m休憩 = 22:30退勤", () => {
			const result = calculateLeaveTime("13:30", 8, 60, "ja");
			expect(result).toBe("22:30");
		});

		test("夕方出勤: 17:00出勤 + 8h勤務 + 60m休憩 = 02:00退勤（翌日）", () => {
			const result = calculateLeaveTime("17:00", 8, 60, "ja");
			expect(result).toBe("02:00");
		});
	});

	// ===== 小数点勤務時間 =====
	describe("小数点を含む勤務時間", () => {
		test("7.5h勤務: 9:00出勤 + 7.5h勤務 + 60m休憩 = 17:30退勤", () => {
			const result = calculateLeaveTime("09:00", 7.5, 60, "ja");
			expect(result).toBe("17:30");
		});

		test("6.25h勤務: 9:00出勤 + 6.25h勤務 + 45m休憩 = 16:00退勤", () => {
			const result = calculateLeaveTime("09:00", 6.25, 45, "ja");
			expect(result).toBe("16:00");
		});

		test("7.75h勤務: 10:00出勤 + 7.75h勤務 + 60m休憩 = 18:45退勤", () => {
			const result = calculateLeaveTime("10:00", 7.75, 60, "ja");
			expect(result).toBe("18:45");
		});
	});

	// ===== 分単位の精度確認 =====
	describe("分単位の精度確認", () => {
		test("1分単位: 9:01出勤 + 8h勤務 + 59m休憩 = 18:00退勤", () => {
			const result = calculateLeaveTime("09:01", 8, 59, "ja");
			expect(result).toBe("18:00");
		});

		test("分の端数: 9:17出勤 + 8h勤務 + 43m休憩 = 18:00退勤", () => {
			const result = calculateLeaveTime("09:17", 8, 43, "ja");
			expect(result).toBe("18:00");
		});

		test("複雑な組み合わせ: 10:23出勤 + 8h勤務 + 67m休憩 = 19:30退勤", () => {
			const result = calculateLeaveTime("10:23", 8, 67, "ja");
			expect(result).toBe("19:30");
		});
	});

	// ===== 言語フォーマット =====
	describe("言語フォーマット", () => {
		test("日本語フォーマット", () => {
			const result = calculateLeaveTime("09:00", 8, 60, "ja");
			expect(result).toBe("18:00");
		});

		test("英語フォーマット", () => {
			const result = calculateLeaveTime("09:00", 8, 60, "en");
			expect(result).toBe("18:00");
		});

		test("日本語フォーマット（日付跨ぎ）", () => {
			const result = calculateLeaveTime("22:00", 10, 60, "ja");
			expect(result).toBe("09:00");
		});

		test("英語フォーマット（日付跨ぎ）", () => {
			const result = calculateLeaveTime("22:00", 10, 60, "en");
			expect(result).toBe("09:00");
		});
	});
});

describe("calculateRemainingTime - 時刻モック使用", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("通常勤務: 15:00に18:00退勤まであと3時間", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 15, 0, 0)); // 15:00
		const result = calculateRemainingTime("18:00", "09:00");
		expect(result.hours).toBe(3);
		expect(result.minutes).toBe(0);
		expect(result.isPast).toBe(false);
	});

	test("退勤後: 19:00に18:00退勤は1時間経過", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 19, 0, 0)); // 19:00
		const result = calculateRemainingTime("18:00", "09:00");
		expect(result.hours).toBe(1);
		expect(result.minutes).toBe(0);
		expect(result.isPast).toBe(true);
	});

	test("夜勤: 20:00（出勤後）に04:00退勤まであと8時間", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 20, 0, 0)); // 20:00（出勤19:00の後）
		const result = calculateRemainingTime("04:00", "19:00");
		expect(result.hours).toBe(8);
		expect(result.minutes).toBe(0);
		expect(result.isPast).toBe(false);
	});

	test("夜勤深夜帯: 01:10に04:00退勤まであと約3時間（+24時間されない）", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 1, 10, 0)); // 01:10（深夜）
		const result = calculateRemainingTime("04:00", "19:00");
		expect(result.hours).toBe(2);
		expect(result.minutes).toBe(50);
		expect(result.isPast).toBe(false);
	});

	test("夜勤深夜帯: 05:00に04:00退勤は1時間経過", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 5, 0, 0)); // 05:00（退勤後）
		const result = calculateRemainingTime("04:00", "19:00");
		expect(result.hours).toBe(1);
		expect(result.minutes).toBe(0);
		expect(result.isPast).toBe(true);
	});

	test("startTimeなしでは日をまたぐ判定をしない", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 1, 10, 0)); // 01:10
		const result = calculateRemainingTime("04:00", null);
		expect(result.hours).toBe(2);
		expect(result.minutes).toBe(50);
		expect(result.isPast).toBe(false);
	});

	test("22:00出勤 → 07:00退勤、現在23:00であと8時間", () => {
		vi.setSystemTime(new Date(2026, 0, 16, 23, 0, 0)); // 23:00
		const result = calculateRemainingTime("07:00", "22:00");
		expect(result.hours).toBe(8);
		expect(result.minutes).toBe(0);
		expect(result.isPast).toBe(false);
	});

	test("22:00出勤 → 07:00退勤、現在03:00であと4時間", () => {
		vi.setSystemTime(new Date(2026, 0, 17, 3, 0, 0)); // 翌日03:00
		const result = calculateRemainingTime("07:00", "22:00");
		expect(result.hours).toBe(4);
		expect(result.minutes).toBe(0);
		expect(result.isPast).toBe(false);
	});
});
