import fetch, { Response } from "node-fetch";

export interface Hourly {
    DewPointC: string,
    DewPointF: string,
    FeelsLikeC: string,
    FeelsLikeF: string,
    HeatIndexC: string,
    HeatIndexF: string,
    WindChillC: string,
    WindChillF: string,
    WindGustKmph: string,
    WindGustMiles: string,
    chanceoffog: string,
    chanceoffrost: string,
    chanceofhightemp: string,
    chanceofovercast: string,
    chanceofrain: string,
    chanceofremdry: string,
    chanceofsnow: string,
    chanceofsunshine: string,
    chanceofthunder: string,
    chanceofwindy: string,
    cloudcover: string,
    humidity: string,
    precipInches: string,
    precipMM: string,
    pressure: string,
    pressureInches: string,
    tempC: string,
    tempF: string,
    time: string,
    uvIndex: string,
    visibility: string,
    visibilityMiles: string,
    weatherCode: string,
    weatherDesc: Array<WeatherDesc>,
    winddir16Point: string,
    winddirDegree: string,
    windspeedKmph: string,
    windspeedMiles: string
}

export interface WeatherDesc {
    value: string
}

export interface WeatherConditions {
    humidity: string,
    temp_C: string,
    temp_F: string,
    pressure: string,
    cloudcover: string,
    FeelsLikeC: string,
    FeelsLikeF: string,
    uvIndex: string,
    visibility: string,
    visibilityMiles: string,
    weatherCode: string,
    weatherDesc: Array<WeatherDesc>
    winddir16Point: string,
    winddirDegree: string,
    windspeedKmph: string,
    windspeedMiles: string
}

export interface AreaName {
    value: string
}

export interface CountryName {
    value: string
}

export interface RegionName {
    value: string
}

export interface Area {
    areaName: Array<AreaName>
    country: Array<CountryName>
    region: Array<RegionName>
}

export interface WeatherData {
    avgtempC: string,
    avgtempF: string,
    mintempC: string,
    mintempF: string,
    maxtempC: string,
    maxtempF: string,
    sunHour: string,
    totalSnow_cm: string,
    uvIndex: string,
    date: string,
    hourly: Array<Hourly>
}

export interface Weather {
    current_condition: Array<WeatherConditions>,
    nearest_area: Array<Area>,
    weather: Array<WeatherData>
}

function paramString(params: { [key: string]: string }): string {
    let p: string[] = [];
    for (const k in params) {
        const v = encodeURI(params[k]);
        p.push(`${k}=${v}`);
    }
    let prefix = "";
    if (p.length > 0) {
        prefix = "?"
    }
    return prefix + p.join("&");
}

async function toJsonOrError(response: Response): Promise<any> {
    const s = response.status;
    console.log(`status code: ${s}`);
    if (s >= 200 && s < 300) {
        const json = await response.json();
        return json;
    } else if (s == 401) {
        throw Error("Unauthorized");
    } else if (s == 403) {
        const json = await response.json();
        let msg = "Forbidden";
        if (json.error && json.error == "insufficient_scope") {
            msg = "Insufficient API token scope";
        }
        console.log(msg);
        throw Error(msg);
    } else if (s == 404) {
        throw Error("Not found");
    } else if (s >= 400 && s < 500) {
        const json = await response.json();
        console.log(json);
        const msg = json.message;
        throw Error(msg);
    } else {
        console.log("unknown error");
        throw Error(`http status ${s}`);
    }
}

export class Wttr {
    private url: string = "https://wttr.in";
    constructor() {

    }

    public async fetch(city?: string, params: { [key: string]: string } = {}, all: boolean = false): Promise<any> {
        try {
            const ps = paramString(params);
            const fullUrl = this.url + "/" + (city ? city : "") + ps;
            console.log(`send GET request: ${fullUrl}`);
            const response = await fetch(fullUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            let json = await toJsonOrError(response);
            return json;
        } catch (error: any) {
            throw Error(error);
        }
    }

    public async getWeather(city?: string): Promise<Weather> {
        // setting lang: "en" manipulate the e.g. kmph values
        return await this.fetch(city, { format: "j1" }) as Weather;
    }
}

export const wttr = new Wttr();