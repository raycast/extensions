export function resolveCoords(lat: number, lon: number): string {
    const latOrientation = lat < 0 ? "S" : "N"
    const lonOrientation = lon < 0 ? "W" : "E"

    return `${latOrientation} ${Math.abs(lat).toFixed(2)}, ${lonOrientation} ${Math.abs(lon).toFixed(2)}`
}
