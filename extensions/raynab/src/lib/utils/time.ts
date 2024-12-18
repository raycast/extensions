import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(quarterOfYear);

export { dayjs as time };
