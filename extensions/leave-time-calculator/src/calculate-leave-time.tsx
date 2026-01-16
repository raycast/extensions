import {
	Action,
	ActionPanel,
	Color,
	getPreferenceValues,
	Icon,
	List,
	updateCommandMetadata,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
	clearTodayStartTime,
	getTodayStartTime,
	setTodayStartTime,
} from "./lib/storage";
import {
	calculateLeaveTime,
	calculateRemainingTime,
	formatTimeString,
} from "./lib/time-utils";
import { getLanguage, useTranslations } from "./lib/translations";
import type { Preferences } from "./lib/types";

// コンポーネント外で1度だけ生成（パフォーマンス最適化）
const START_TIMES = (() => {
	const times: string[] = [];
	for (let h = 7; h <= 13; h++) {
		for (const m of [0, 15, 30, 45]) {
			times.push(formatTimeString(h, m));
		}
	}
	return times;
})();

export default function Command() {
	const prefs = getPreferenceValues<Preferences>();
	const workHours = parseFloat(prefs.defaultWorkHours || "8");
	const breakMins = parseInt(prefs.defaultBreakMinutes || "60", 10);
	const lang = getLanguage(prefs.language || "system");
	const t = useTranslations(lang);

	const [todayStart, setTodayStart] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [searchText, setSearchText] = useState("");

	useEffect(() => {
		getTodayStartTime().then((time) => {
			setTodayStart(time);
			setIsLoading(false);
		});
	}, []);

	// Dynamic subtitle更新 + 定期更新
	const [, setTick] = useState(0);

	useEffect(() => {
		const updateSubtitle = async () => {
			if (todayStart) {
				const leave = calculateLeaveTime(
					todayStart,
					workHours,
					breakMins,
					lang,
				);
				const rem = calculateRemainingTime(leave, todayStart);
				const subtitle = rem.isPast
					? t.overtime(rem.hours, rem.minutes)
					: `${leave} 退勤 - ${t.remaining(rem.hours, rem.minutes)}`;
				await updateCommandMetadata({ subtitle });
			} else {
				await updateCommandMetadata({ subtitle: "" });
			}
		};
		updateSubtitle();

		// 1分ごとに更新
		const interval = setInterval(() => {
			updateSubtitle();
			setTick((tick) => tick + 1); // UIも再レンダリング
		}, 60000);

		return () => clearInterval(interval);
	}, [todayStart, workHours, breakMins, lang, t]);

	const handleSelect = async (startTime: string) => {
		await setTodayStartTime(startTime);
		setTodayStart(startTime);
	};

	const handleClear = async () => {
		await clearTodayStartTime();
		setTodayStart(null);
	};

	// カスタム時間のパース（9:21 や 09:21 形式）
	const parseCustomTime = (input: string): string | null => {
		const match = input.match(/^(\d{1,2}):(\d{2})$/);
		if (!match) return null;
		const h = parseInt(match[1], 10);
		const m = parseInt(match[2], 10);
		if (h < 0 || h > 23 || m < 0 || m > 59) return null;
		return formatTimeString(h, m);
	};

	const customTime = parseCustomTime(searchText);

	// 今日の退勤時間と残り時間を計算
	const leaveTime = todayStart
		? calculateLeaveTime(todayStart, workHours, breakMins, lang)
		: null;
	const remaining = leaveTime
		? calculateRemainingTime(leaveTime, todayStart)
		: null;

	const filteredTimes = searchText
		? START_TIMES.filter((time) => time.includes(searchText))
		: START_TIMES;

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder={t.searchBarPlaceholder}
			onSearchTextChange={setSearchText}
		>
			{/* 今日の予定（設定済みの場合） */}
			{todayStart && leaveTime && remaining && (
				<List.Section title={t.todaySection}>
					<List.Item
						title={t.leaveDisplay(leaveTime)}
						subtitle={
							remaining.isPast
								? t.overtime(remaining.hours, remaining.minutes)
								: t.remaining(remaining.hours, remaining.minutes)
						}
						icon={{
							source: Icon.Clock,
							tintColor: remaining.isPast ? Color.Orange : Color.Blue,
						}}
						accessories={[
							{ tag: { value: todayStart, color: Color.SecondaryText } },
							{
								tag: {
									value: t.workBreakTag(workHours, breakMins),
									color: Color.SecondaryText,
								},
							},
						]}
						actions={
							<ActionPanel>
								<Action.CopyToClipboard title="Copy" content={leaveTime} />
								<Action
									title={t.reset}
									icon={Icon.Trash}
									style={Action.Style.Destructive}
									onAction={handleClear}
								/>
							</ActionPanel>
						}
					/>
				</List.Section>
			)}

			{/* カスタム時間（入力が有効な場合） */}
			{customTime && !START_TIMES.includes(customTime) && (
				<List.Section title={t.customTimeSection}>
					<List.Item
						title={customTime}
						icon={{ source: Icon.Plus, tintColor: Color.Orange }}
						accessories={[
							{
								text: `→ ${calculateLeaveTime(customTime, workHours, breakMins, lang)}`,
							},
						]}
						actions={
							<ActionPanel>
								<Action
									title={t.select}
									icon={Icon.Check}
									onAction={() => handleSelect(customTime)}
								/>
							</ActionPanel>
						}
					/>
				</List.Section>
			)}

			{/* 出勤時間選択 */}
			<List.Section title={t.selectStartSection}>
				{filteredTimes.map((time) => {
					const leave = calculateLeaveTime(time, workHours, breakMins, lang);
					const rem = calculateRemainingTime(leave, null);
					const isSelected = time === todayStart;

					return (
						<List.Item
							key={time}
							title={t.startDisplay(time)}
							icon={
								isSelected
									? { source: Icon.CheckCircle, tintColor: Color.Green }
									: Icon.Circle
							}
							accessories={[
								{ text: `→ ${leave}` },
								{ tag: rem.isPast ? "✓" : t.remaining(rem.hours, rem.minutes) },
							]}
							actions={
								<ActionPanel>
									<Action
										title={t.select}
										icon={Icon.Check}
										onAction={() => handleSelect(time)}
									/>
									<Action.CopyToClipboard
										title={t.copyLeaveTime}
										content={leave}
									/>
								</ActionPanel>
							}
						/>
					);
				})}
			</List.Section>
		</List>
	);
}
