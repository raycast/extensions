import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(calendar);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(quarterOfYear);
dayjs.extend(updateLocale);

dayjs.updateLocale('en', {
  calendar: {
    lastDay: '[Yesterday]',
    sameDay: '[Today]',
    nextDay: '[Tomorrow]',
    lastWeek: '[Last] dddd',
    nextWeek: 'dddd',
    sameElse: function () {
      // @see https://day.js.org/docs/en/customization/calendar
      // @ts-expect-error the scope of this here refers to the original dayjs instance
      return this.fromNow();
    },
  },
});

/**
 * Get the current month according to the UTC time zone.
 */
function getCurrentMonth(): string {
  return new Intl.DateTimeFormat('en-us', { month: 'long', timeZone: 'UTC' }).format(new Date());
}

export { dayjs as time, getCurrentMonth };
