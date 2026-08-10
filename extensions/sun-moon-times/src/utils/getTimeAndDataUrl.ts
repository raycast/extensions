import { countryList } from "../ressources/countryList"

export function getTimeAndDataUrl(countryCode: string, cityName: string): string {
    const city = cityName
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036f]/g, "")
        .replaceAll(/['´`^’‘‛]/g, "")
        .replaceAll(/ - /g, "-")
        .replaceAll(/ /g, "-")
        .replaceAll(/st\./gi, "saint")
        .toLowerCase()

    return `https://www.timeanddate.com/sun/${countryList[countryCode].timeAndDateName}/${city}`
}
