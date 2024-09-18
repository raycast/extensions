export interface ResponseData {
    records: {
        record: {
            fields: {
                geoname_id: number
                name: string
                country_code: string
                timezone: string
                coordinates: {
                    lat: number
                    lon: number
                }
            }
        }
    }[]
}
