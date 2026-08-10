const baseUrl =
    "https://public.opendatasoft.com/api/v2/catalog/datasets/geonames-all-cities-with-a-population-1000/records"

const select = "geoname_id%2C%20name%2C%20country_code%2C%20coordinates%2C%20timezone"
const where = (cityName: string) =>
    `alternate_names%20like%20%22${cityName}%2A%22%20OR%20name%20like%20%22${cityName}%2A%22`
const orderBy = "population%20DESC&"
const limit = "50"
const offset = "0"
const lang = "en"
const timezone = "UTC"
const queryUrl = (cityName: string) =>
    `?select=${select}&where=${where(
        cityName
    )}&order_by=${orderBy}&limit=${limit}&offset=${offset}&lang=${lang}&timezone=${timezone}`

export const ressourceUrl = (cityName: string) => `${baseUrl}${queryUrl(cityName)}`
