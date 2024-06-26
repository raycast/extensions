import dayjs from "dayjs";

export function timestampToString(timestamp: string) {
    return dayjs.unix(Number(timestamp)).toString();
}