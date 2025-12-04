export interface CityItem {
    geonameId: number
    name: string
    countryCode: string
    timezone: string
    coordinates: { lat: number; lon: number }
}
