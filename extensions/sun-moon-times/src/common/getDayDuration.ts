export function getDayDuration(sunrise: Date, sunset: Date): string {
    const duration = sunset.getTime() - sunrise.getTime()
    const hours = Math.floor(duration / 1000 / 60 / 60)
    const minutes = Math.floor((duration - hours * 1000 * 60 * 60) / 1000 / 60)
    const seconds = Math.floor((duration - hours * 1000 * 60 * 60 - minutes * 1000 * 60) / 1000)

    return `${Math.abs(hours)}h ${minutes}m ${seconds}s`
}
