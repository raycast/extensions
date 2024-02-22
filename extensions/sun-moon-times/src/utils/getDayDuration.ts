export function getDayDuration(sunrise: Date, sunset: Date): string {
    const timeZoneOffset = sunrise.getTimezoneOffset() * 60 * 1000
    const duration = sunset.getTime() + timeZoneOffset - (sunrise.getTime() + timeZoneOffset)
    const hours = Math.floor(duration / 1000 / 60 / 60)
    const minutes = Math.floor((duration - hours * 1000 * 60 * 60) / 1000 / 60)
    const seconds = Math.floor((duration - hours * 1000 * 60 * 60 - minutes * 1000 * 60) / 1000)

    return `${hours > 0 ? hours : hours + 24}h ${minutes}m ${seconds}s`
}
