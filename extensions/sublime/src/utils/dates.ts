import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

dayjs.updateLocale("en", {
    relativeTime: {
        future: (parsedToken: string) => {
            if (parsedToken === "seconds") {
                return "in a few seconds";
            }

            return `in ${parsedToken}`;
        },
        past: (parsedToken: string) => {
            if (parsedToken === "seconds") {
                return "just now";
            }

            return `${parsedToken} ago`;
        },
        s: "seconds",
        m: "1m",
        mm: "%dm",
        h: "1h",
        hh: "%dh",
        d: "1d",
        dd: "%dd",
        M: "1mo",
        MM: "%dmo",
        y: "1y",
        yy: "%dy",
    },
});

const getRelativeTime = (date: string) => dayjs.utc(date).fromNow();

const parseDate = (date: string) => dayjs(date).format("MMMM D, YYYY");

export { getRelativeTime, parseDate };
