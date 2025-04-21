// To parse this data:
//
//   import { Convert, PurpleSensor } from "./file";
//
//   const purpleSensor = Convert.toPurpleSensor(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.
// https://app.quicktype.io

export interface PurpleSensor {
  api_version: string;
  time_stamp: number;
  data_time_stamp: number;
  sensor: Sensor;
}

export interface Sensor {
  sensor_index: number;
  last_modified: number;
  date_created: number;
  last_seen: number;
  private: number;
  is_owner: number;
  name: string;
  icon: number;
  location_type: number;
  model: string;
  hardware: string;
  led_brightness: number;
  firmware_version: string;
  rssi: number;
  uptime: number;
  pa_latency: number;
  memory: number;
  position_rating: number;
  latitude: number;
  longitude: number;
  altitude: number;
  channel_state: number;
  channel_flags: number;
  channel_flags_manual: number;
  channel_flags_auto: number;
  confidence: number;
  confidence_auto: number;
  confidence_manual: number;
  humidity: number;
  humidity_a: number;
  humidity_b: number;
  temperature: number;
  temperature_a: number;
  temperature_b: number;
  pressure: number;
  pressure_a: number;
  pressure_b: number;
  voc: number;
  voc_b: number;
  analog_input: number;
  "pm1.0": number;
  "pm1.0_a": number;
  "pm1.0_b": number;
  "pm2.5": number;
  "pm2.5_a": number;
  "pm2.5_b": number;
  "pm2.5_alt": number;
  "pm2.5_alt_a": number;
  "pm2.5_alt_b": number;
  "pm10.0": number;
  "pm10.0_a": number;
  "pm10.0_b": number;
  scattering_coefficient: number;
  scattering_coefficient_a: number;
  scattering_coefficient_b: number;
  deciviews: number;
  deciviews_a: number;
  deciviews_b: number;
  visual_range: number;
  visual_range_a: number;
  visual_range_b: number;
  "0.3_um_count": number;
  "0.3_um_count_a": number;
  "0.3_um_count_b": number;
  "0.5_um_count": number;
  "0.5_um_count_a": number;
  "0.5_um_count_b": number;
  "1.0_um_count": number;
  "1.0_um_count_a": number;
  "1.0_um_count_b": number;
  "2.5_um_count": number;
  "2.5_um_count_a": number;
  "2.5_um_count_b": number;
  "5.0_um_count": number;
  "5.0_um_count_a": number;
  "5.0_um_count_b": number;
  "10.0_um_count": number;
  "10.0_um_count_a": number;
  "10.0_um_count_b": number;
  "pm1.0_cf_1": number;
  "pm1.0_cf_1_a": number;
  "pm1.0_cf_1_b": number;
  "pm1.0_atm": number;
  "pm1.0_atm_a": number;
  "pm1.0_atm_b": number;
  "pm2.5_atm": number;
  "pm2.5_atm_a": number;
  "pm2.5_atm_b": number;
  "pm2.5_cf_1": number;
  "pm2.5_cf_1_a": number;
  "pm2.5_cf_1_b": number;
  "pm10.0_atm": number;
  "pm10.0_atm_a": number;
  "pm10.0_atm_b": number;
  "pm10.0_cf_1": number;
  "pm10.0_cf_1_a": number;
  "pm10.0_cf_1_b": number;
  primary_id_a: number;
  primary_key_a: string;
  primary_id_b: number;
  primary_key_b: string;
  secondary_id_a: number;
  secondary_key_a: string;
  secondary_id_b: number;
  secondary_key_b: string;
  stats: { [key: string]: number };
  stats_a: { [key: string]: number };
  stats_b: { [key: string]: number };
}

// Converts JSON strings to/from your types
export class Convert {
  public static toPurpleSensor(json: string): PurpleSensor {
    return JSON.parse(json);
  }

  public static purpleSensorToJson(value: PurpleSensor): string {
    return JSON.stringify(value);
  }
}

export interface AQIReport {
  Number: number;
  Description: string;
  LongDescription: string;
}

function aqiFromPM(pm: number, humidity: number): AQIReport {
  const r: AQIReport = {
    Number: pm,
    Description: "-",
    LongDescription: "",
  };

  r.Number = 0;
  r.Description = "";
  r.LongDescription = "";

  // if (isNaN(pm)) return r
  // if (pm == undefined) return r;
  // if (pm < 0) return pm;
  // if (pm > 1000) return "-";
  /*                                  AQI         RAW PM2.5
    Good                               0 - 50   |   0.0 – 12.0
    Moderate                          51 - 100  |  12.1 – 35.4
    Unhealthy for Sensitive Groups   101 – 150  |  35.5 – 55.4
    Unhealthy                        151 – 200  |  55.5 – 150.4
    Very Unhealthy                   201 – 300  |  150.5 – 250.4
    Hazardous                        301 – 400  |  250.5 – 350.4
    Hazardous                        401 – 500  |  350.5 – 500.4
    */

  // we need to adjust the pm2.5 value per the EPA update
  // https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM

  pm = calculateEPAValue(pm, humidity);

  if (pm > 350.5) {
    r.Number = calcAQI(pm, 500, 401, 500.4, 350.5);
    r.Description = "⚫ Hazardous";
    r.LongDescription =
      ">300: Health warning of emergency conditions: everyone is more likely to be affected with 24 hours of exposure.";
  } else if (pm > 250.5) {
    r.Number = calcAQI(pm, 400, 301, 350.4, 250.5);
    r.Description = "💀 Hazardous";
    r.LongDescription =
      ">300: Health warning of emergency conditions: everyone is more likely to be affected with 24 hours of exposure.";
  } else if (pm > 150.5) {
    r.Number = calcAQI(pm, 300, 201, 250.4, 150.5);
    r.Description = "🟤 Very Unhealthy";
    r.LongDescription =
      "201-300: Health alert: The risk of health effects is increased for everyone with 24 hours of exposure.";
  } else if (pm > 55.5) {
    r.Number = calcAQI(pm, 200, 151, 150.4, 55.5);
    r.Description = "🔴 Unhealthy";
    r.LongDescription =
      "151-200: Some members of the general public may experience health effects with 24 hours of exposure; members of sensitive groups may experience more serious health effects.";
  } else if (pm > 35.5) {
    r.Number = calcAQI(pm, 150, 101, 55.4, 35.5);
    r.Description = "🟠 Unhealthy for Sensitive Groups";
    r.LongDescription =
      "101-150: Members of sensitive groups may experience health effects with 24 hours of exposure. The general public is less likely to be affected.";
  } else if (pm > 12.1) {
    r.Number = calcAQI(pm, 100, 51, 35.4, 12.1);
    r.Description = "🟡 Moderate";
    r.LongDescription =
      "51-100: Air quality is acceptable. However, there may be a risk for some people with 24 hours of exposure, particularly those who are unusually sensitive to air pollution.";
  } else if (pm >= 0) {
    r.Number = calcAQI(pm, 50, 0, 12, 0);
    r.Description = "🟢 Good";
    r.LongDescription =
      "0-50: Air quality is satisfactory, and air pollution poses little or no risk with 24 hours of exposure.";
  } else {
    r.Number = 0;
    r.Description = "undefined";
  }
  return r;
}

function calcAQI(Cp: number, Ih: number, Il: number, BPh: number, BPl: number) {
  const a = Ih - Il;
  const b = BPh - BPl;
  const c = Cp - BPl;
  return Math.round((a / b) * c + Il);
}

function calculateEPAValue(pm2_5_atm: number, RH: number): number {
  if (pm2_5_atm >= 0 && pm2_5_atm < 30) {
    return 0.524 * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 30 && pm2_5_atm < 50) {
    return (0.786 * (pm2_5_atm / 20 - 3 / 2) + 0.524 * (1 - (pm2_5_atm / 20 - 3 / 2))) * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 50 && pm2_5_atm < 210) {
    return 0.786 * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 210 && pm2_5_atm < 260) {
    return (
      (0.69 * (pm2_5_atm / 50 - 21 / 5) + 0.786 * (1 - (pm2_5_atm / 50 - 21 / 5))) * pm2_5_atm -
      0.0862 * RH * (1 - (pm2_5_atm / 50 - 21 / 5)) +
      2.966 * (pm2_5_atm / 50 - 21 / 5) +
      5.75 * (1 - (pm2_5_atm / 50 - 21 / 5)) +
      8.84 * Math.pow(10, -4) * Math.pow(pm2_5_atm, 2) * (pm2_5_atm / 50 - 21 / 5)
    );
  } else if (pm2_5_atm >= 260) {
    return 2.966 + 0.69 * pm2_5_atm + 8.84 * Math.pow(10, -4) * Math.pow(pm2_5_atm, 2);
  }

  // Default return statement
  return pm2_5_atm;
}

export class PurpleAir {
  purpleSensor: PurpleSensor;
  private _currentAQI: AQIReport;
  private _humidity: number;
  private _AQI_10Minutes: AQIReport;
  private _AQI_30Minutes: AQIReport;
  private _AQI_60Minutes: AQIReport;
  private _AQI_6Hour: AQIReport;
  private _AQI_24Hour: AQIReport;
  private _AQI_1Week: AQIReport;

  public get currentAQI(): AQIReport {
    return this._currentAQI;
  }

  public get Humitiy(): number {
    return this._humidity;
  }

  public get AQI_10Minutes(): AQIReport {
    return this._AQI_10Minutes;
  }

  public get AQI_30Minutes(): AQIReport {
    return this._AQI_30Minutes;
  }

  public get AQI_60Minutes(): AQIReport {
    return this._AQI_60Minutes;
  }

  public get AQI_6Hour(): AQIReport {
    return this._AQI_6Hour;
  }

  public get AQI_24Hour(): AQIReport {
    return this._AQI_24Hour;
  }

  public get AQI_1Week(): AQIReport {
    return this._AQI_1Week;
  }

  constructor(json: string) {
    this.purpleSensor = this.toPurpleSensor(json);
    this._humidity = this.purpleSensor.sensor.humidity;
    this._currentAQI = aqiFromPM(this.purpleSensor.sensor["pm2.5"] as number, this._humidity) as AQIReport;
    this._AQI_10Minutes = aqiFromPM(
      this.purpleSensor.sensor.stats["pm2.5_10minute"] as number,
      this._humidity
    ) as AQIReport;
    this._AQI_30Minutes = aqiFromPM(
      this.purpleSensor.sensor.stats["pm2.5_30minute"] as number,
      this._humidity
    ) as AQIReport;
    this._AQI_60Minutes = aqiFromPM(
      this.purpleSensor.sensor.stats["pm2.5_60minute"] as number,
      this._humidity
    ) as AQIReport;
    this._AQI_6Hour = aqiFromPM(this.purpleSensor.sensor.stats["pm2.5_6hour"] as number, this._humidity) as AQIReport;
    this._AQI_24Hour = aqiFromPM(this.purpleSensor.sensor.stats["pm2.5_24hour"] as number, this._humidity) as AQIReport;
    this._AQI_1Week = aqiFromPM(this.purpleSensor.sensor.stats["pm2.5_1week"] as number, this._humidity) as AQIReport;
  }

  public getAirQualitySummary(): string {
    return (
      "The AQI for " +
      this.purpleSensor.sensor.name +
      " is: " +
      this.currentAQI?.Number +
      " - " +
      this.currentAQI?.Description
    );
  }

  private toPurpleSensor(json: string): PurpleSensor {
    return Convert.toPurpleSensor(json);
  }
}

export interface PurpleAirBatchResponse {
  api_version: string;
  time_stamp: number;
  data_time_stamp: number;
  fields: string[];
  data: any[][];
}

export class PurpleAirBatch {
  sensorData: Map<string, BatchSensorData> = new Map();

  constructor(json: string) {
    // Parse JSON directly and process immediately to avoid keeping the full response in memory
    const batchResponse = JSON.parse(json) as PurpleAirBatchResponse;
    this.processBatchData(batchResponse);
    // Don't store the full response object to save memory
  }

  private processBatchData(batchResponse: PurpleAirBatchResponse) {
    const fields = batchResponse.fields;

    // Find indices of required fields
    const idxMap: Record<string, number> = {};
    fields.forEach((field, index) => {
      idxMap[field] = index;
    });

    // Process each sensor's data
    for (const sensorArray of batchResponse.data) {
      const sensorId = sensorArray[0].toString();
      const name = idxMap.name !== undefined ? (sensorArray[idxMap.name] as string) : "Unknown";
      const humidity = idxMap.humidity !== undefined ? (sensorArray[idxMap.humidity] as number) : 0;
      const temperature = idxMap.temperature !== undefined ? (sensorArray[idxMap.temperature] as number) : 0;

      // PM2.5 values - current and time-based averages
      const pm25 =
        idxMap.pm2_5 !== undefined
          ? (sensorArray[idxMap.pm2_5] as number)
          : idxMap.pm2_5_atm !== undefined
          ? (sensorArray[idxMap.pm2_5_atm] as number)
          : 0;
      const pm25_10minute = idxMap.pm2_5_10minute !== undefined ? (sensorArray[idxMap.pm2_5_10minute] as number) : 0;
      const pm25_30minute = idxMap.pm2_5_30minute !== undefined ? (sensorArray[idxMap.pm2_5_30minute] as number) : 0;
      const pm25_60minute = idxMap.pm2_5_60minute !== undefined ? (sensorArray[idxMap.pm2_5_60minute] as number) : 0;
      const pm25_6hour = idxMap.pm2_5_6hour !== undefined ? (sensorArray[idxMap.pm2_5_6hour] as number) : 0;
      const pm25_24hour = idxMap.pm2_5_24hour !== undefined ? (sensorArray[idxMap.pm2_5_24hour] as number) : 0;
      const pm25_1week = idxMap.pm2_5_1week !== undefined ? (sensorArray[idxMap.pm2_5_1week] as number) : 0;

      // Calculate AQI values using the existing aqiFromPM function
      const currentAQI = aqiFromPM(pm25, humidity);
      const aqi10Minutes = aqiFromPM(pm25_10minute, humidity);
      const aqi30Minutes = aqiFromPM(pm25_30minute, humidity);
      const aqi60Minutes = aqiFromPM(pm25_60minute, humidity);
      const aqi6Hour = aqiFromPM(pm25_6hour, humidity);
      const aqi24Hour = aqiFromPM(pm25_24hour, humidity);
      const aqi1Week = aqiFromPM(pm25_1week, humidity);

      // Create a BatchSensorData object and add it to the map
      this.sensorData.set(sensorId, {
        sensorId,
        name,
        humidity,
        temperature,
        pm25,
        pm25_10minute,
        pm25_30minute,
        pm25_60minute,
        pm25_6hour,
        pm25_24hour,
        pm25_1week,
        currentAQI,
        aqi10Minutes,
        aqi30Minutes,
        aqi60Minutes,
        aqi6Hour,
        aqi24Hour,
        aqi1Week,
      });
    }
  }

  public getSensor(sensorId: string): BatchSensorData | undefined {
    return this.sensorData.get(sensorId);
  }

  public getAllSensors(): BatchSensorData[] {
    return Array.from(this.sensorData.values());
  }
}

export interface BatchSensorData {
  sensorId: string;
  name: string;
  humidity: number;
  temperature: number;
  pm25: number;
  pm25_10minute: number;
  pm25_30minute: number;
  pm25_60minute: number;
  pm25_6hour: number;
  pm25_24hour: number;
  pm25_1week: number;
  currentAQI: AQIReport;
  aqi10Minutes: AQIReport;
  aqi30Minutes: AQIReport;
  aqi60Minutes: AQIReport;
  aqi6Hour: AQIReport;
  aqi24Hour: AQIReport;
  aqi1Week: AQIReport;
}
