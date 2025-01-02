import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(quarterOfYear);

/**
 * Get the current month according to the UTC time zone.
 */
function getCurrentMonth(): string {
  return new Intl.DateTimeFormat('en-us', { month: 'long', timeZone: 'UTC' }).format(new Date());
}

export { dayjs as time, getCurrentMonth };
