import dayjs from 'dayjs';
import Duration from 'dayjs/plugin/duration';
import RelativeTime from 'dayjs/plugin/relativeTime';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(Duration);
dayjs.extend(RelativeTime);
dayjs.extend(LocalizedFormat);

type DateParam = Parameters<typeof dayjs>[0];

export function timeSince(from: DateParam, inMillisecond: true): string;
export function timeSince(from: number, inMillisecond?: false): string;
export function timeSince(from: DateParam, inMillisecond = false): string {
  const origin = inMillisecond ? dayjs(from) : dayjs.unix(from as number);
  return origin.fromNow(false);
}

export function timeFormat(time: DateParam, inMillisecond: true): string;
export function timeFormat(time: number, inMillisecond?: false): string;
export function timeFormat(time: DateParam, inMillisecond = false): string {
  const origin = inMillisecond ? dayjs(time) : dayjs.unix(time as number);
  return origin.format('lll');
}
