export function isoDate(date: Date) {
    return date.toISOString().split("T")[0];
}

export function today(): Date {
    return new Date(isoDate(new Date()));
}
