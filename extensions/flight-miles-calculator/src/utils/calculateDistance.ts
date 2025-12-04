import { degToRad } from "./degToRad"

interface Coordinate {
    latitude: number
    longitude: number
}

export function calculateDistance(start: Coordinate, end: Coordinate): { km: number; mi: number } {
    const R = 6371 // Earth's mean radius in km
    const dLat = degToRad(end.latitude - start.latitude)
    const dLon = degToRad(end.longitude - start.longitude)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degToRad(start.latitude)) * Math.cos(degToRad(end.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km

    return { km: d, mi: d * 0.621371 }
}
