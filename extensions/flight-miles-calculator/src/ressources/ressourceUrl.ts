const baseUrl = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/airports-code/records"

const select = "column_1,airport_name,country_code,latitude,longitude"
const where = (queryString: string) =>
    `column_1%20like%20%22${queryString}*%22%20OR%20airport_name%20like%20%22${queryString}*%22%20OR%20city_name%20like%20%22${queryString}*%22%20OR%20country_name%20like%20%22${queryString}*%22`
const limit = "20"
const queryUrl = (queryString: string) => `?select=${select}&where=${where(queryString)}&limit=${limit}`

export const ressourceUrl = (queryString: string) => `${baseUrl}${queryUrl(queryString)}`
