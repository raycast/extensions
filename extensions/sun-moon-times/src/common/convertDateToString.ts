export function convertDateToString(date: Date, timezone: string): string {
    // use Boise timezone because America/Ciudad_Juarez is not in macOS timezone database as of macOS 13.3.1
    const tz = timezone === "America/Ciudad_Juarez" ? "America/Boise" : timezone
    const options: Intl.DateTimeFormatOptions = {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
    }

    return date.toLocaleString("default", options)
}
