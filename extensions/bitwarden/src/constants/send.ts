import { SendDeletionDateOption } from "~/types/send";

export const SendDeletionDateOptionsToHourOffsetMap = {
  [SendDeletionDateOption.OneHour]: 1,
  [SendDeletionDateOption.OneDay]: 24,
  [SendDeletionDateOption.TwoDays]: 48,
  [SendDeletionDateOption.ThreeDays]: 72,
  [SendDeletionDateOption.SevenDays]: 168,
  [SendDeletionDateOption.ThirtyDays]: 720,
} as const satisfies Partial<Record<SendDeletionDateOption, null | number>>;
