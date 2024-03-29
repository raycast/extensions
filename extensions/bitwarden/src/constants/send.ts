import { SendDateOption } from "~/types/send";

export const SendDateOptionsToHourOffsetMap = {
  [SendDateOption.OneHour]: 1,
  [SendDateOption.OneDay]: 24,
  [SendDateOption.TwoDays]: 48,
  [SendDateOption.ThreeDays]: 72,
  [SendDateOption.SevenDays]: 168,
  [SendDateOption.ThirtyDays]: 720,
} as const satisfies Partial<Record<SendDateOption, null | number>>;
