import { Action, ActionPanel } from "@raycast/api";
import { DailyHoroscope, MonthlyHoroscope, WeeklyHoroscope } from "../types";

type HoroscopeActionsProps = {
  data: DailyHoroscope | WeeklyHoroscope | MonthlyHoroscope | undefined;
};
export default function HoroscopeActions({ data }: HoroscopeActionsProps) {
  return !data ? undefined : (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Horoscope" content={data.data.horoscope_data} />
    </ActionPanel>
  );
}
